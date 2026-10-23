import { sha256 } from './http';
import { appendTicket, findRowByHash, moveToTrash, readTickets, updateTicket, uploadImage } from './google';
import { extractTicket } from './openai';
import { monthTotals, searchTickets, ticketLine, visibleTickets } from './queries';
import { validateTicket } from './ticket';
import { allowedChat, answerCallback, downloadPhoto, operationButtons, sendMessage, ticketSummary } from './telegram';
import type { Env, Operation, TelegramUpdate, Ticket } from './types';

const day = 86_400;
const editFields = new Set<keyof Ticket>(['comercio', 'fecha', 'total', 'subtotal', 'iva', 'propina', 'categoria', 'metodo_pago']);
class PartialSaveError extends Error {}

async function semanticKey(ticket: Ticket): Promise<string | null> {
  if (!ticket.folio || ticket.total === null) return null;
  const identity = `${ticket.comercio.trim().toLocaleLowerCase()}|${ticket.fecha}|${ticket.total.toFixed(2)}|${ticket.folio.trim().toLocaleLowerCase()}`;
  return `fingerprint:${await sha256(new TextEncoder().encode(identity).buffer)}`;
}

function required(env: Env): void {
  const names = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'ALLOWED_CHAT_IDS', 'OPENAI_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_FOLDER_ID', 'GOOGLE_SHEET_ID', 'GOOGLE_TRASH_FOLDER_ID'] as const;
  const missing = names.filter(name => !env[name]);
  if (missing.length) throw new Error(`Falta configuración: ${missing.join(', ')}`);
}

async function saveOperation(env: Env, op: Operation): Promise<void> {
  await env.STATE.put(`op:${op.id}`, JSON.stringify(op));
}

async function handlePhoto(env: Env, chatId: number, userId: number, fileId: string, updateId: number): Promise<void> {
  const countKey = `daily:${chatId}:${new Date().toISOString().slice(0, 10)}`;
  const count = Number(await env.STATE.get(countKey) ?? 0);
  if (count >= 30) { await sendMessage(env, chatId, 'Alcanzaste el límite diario de 30 tickets.'); return; }
  const { bytes, mime } = await downloadPhoto(env, fileId);
  const hash = await sha256(bytes);
  const duplicate = await env.STATE.get(`hash:${hash}`);
  if (duplicate) { await sendMessage(env, chatId, `Este ticket ya fue registrado (operación ${duplicate}).`); return; }
  let op = await env.STATE.get<Operation>(`stage:${hash}`, 'json');
  if (!op) {
    const { ticket, review } = await extractTicket(env, bytes, mime);
    const key = await semanticKey(ticket);
    const sameTicket = key ? await env.STATE.get(key) : null;
    if (sameTicket) { await sendMessage(env, chatId, `Este ticket ya fue registrado (operación ${sameTicket}).`); return; }
    const id = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    op = { id, hash, chatId, userId, fileId: '', row: 0, ticket, status: review ? 'Revisar' : 'OK' };
    const image = await uploadImage(env, bytes, mime, ticket, hash);
    op.fileId = image.id;
    await env.STATE.put(`stage:${hash}`, JSON.stringify(op), { expirationTtl: day * 7 });
  }
  if (op.chatId !== chatId) { await sendMessage(env, chatId, 'Este ticket ya está en proceso en otro chat.'); return; }
  const imageLink = `https://drive.google.com/file/d/${op.fileId}/view`;
  try {
    op.row = await findRowByHash(env, hash) ?? await appendTicket(env, op, imageLink);
  } catch {
    throw new PartialSaveError(`La imagen quedó en Drive (${imageLink}), pero no pude confirmar la fila en Sheets. Reenvía la misma foto para recuperar el registro.`);
  }
  await saveOperation(env, op);
  await env.STATE.put(`hash:${hash}`, op.id);
  const key = await semanticKey(op.ticket);
  if (key) await env.STATE.put(key, op.id);
  await env.STATE.put(`update:${updateId}`, op.id, { expirationTtl: day });
  await env.STATE.put(countKey, String(count + 1), { expirationTtl: day * 2 });
  await env.STATE.delete(`stage:${hash}`);
  await sendMessage(env, chatId, ticketSummary(op.ticket, op.status, imageLink), operationButtons(op.id));
}

async function handleText(env: Env, chatId: number, text: string): Promise<void> {
  if (text.startsWith('/start') || text.startsWith('/ayuda')) {
    await sendMessage(env, chatId, 'Envíame una foto de un ticket. Consultas: /ultimos, /total_mes [AAAA-MM], /buscar <comercio, folio, categoría o AAAA-MM>. Solo ves tus tickets. Para corregir usa el botón del registro.');
    return;
  }
  const command = text.trim().split(/\s+/, 1)[0];
  if (command === '/ultimos' || command === '/total_mes' || command === '/buscar') {
    const argument = text.trim().slice(command.length).trim();
    if (command === '/buscar' && !argument) { await sendMessage(env, chatId, 'Uso: /buscar comercio, folio, categoría o AAAA-MM'); return; }
    if (command === '/total_mes' && argument && !/^\d{4}-(0[1-9]|1[0-2])$/.test(argument)) { await sendMessage(env, chatId, 'Uso: /total_mes AAAA-MM'); return; }
    const tickets = visibleTickets(await readTickets(env), chatId, env.QUERY_SCOPE);
    if (command === '/ultimos') {
      await sendMessage(env, chatId, tickets.sort((a, b) => b.row - a.row).slice(0, 5).map(ticketLine).join('\n') || 'No hay tickets registrados.');
    } else if (command === '/buscar') {
      const matches = searchTickets(tickets, argument).sort((a, b) => b.row - a.row);
      await sendMessage(env, chatId, matches.length ? `${matches.slice(0, 5).map(ticketLine).join('\n')}\nMostrando ${Math.min(matches.length, 5)} de ${matches.length}.` : 'No encontré tickets que coincidan.');
    } else {
      const month = argument || new Date().toISOString().slice(0, 7);
      const totals = monthTotals(tickets, month);
      await sendMessage(env, chatId, totals.size ? [...totals].map(([currency, total]) => `${month}: ${total.toFixed(2)} ${currency}`).join('\n') : `No hay tickets para ${month}.`);
    }
    return;
  }
  const pending = await env.STATE.get<string>(`pending:${chatId}`);
  if (!pending) { await sendMessage(env, chatId, 'Envíame una foto de un ticket o escribe /ayuda.'); return; }
  const match = text.match(/^([a-z_]+)\s*=\s*(.+)$/i);
  if (!match || !editFields.has(match[1] as keyof Ticket)) { await sendMessage(env, chatId, 'Escribe campo=valor. Campos: comercio, fecha, total, subtotal, iva, propina, categoria, metodo_pago.'); return; }
  const op = await env.STATE.get<Operation>(`op:${pending}`, 'json');
  if (!op || op.chatId !== chatId || !op.row || op.status === 'Eliminado') { await env.STATE.delete(`pending:${chatId}`); return; }
  const field = match[1] as keyof Ticket;
  const value = ['total', 'subtotal', 'iva', 'propina'].includes(field) ? Number(match[2]) : match[2].trim();
  if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) { await sendMessage(env, chatId, 'El importe debe ser un número no negativo.'); return; }
  const candidate = { ...op.ticket, [field]: value };
  try { validateTicket(candidate); } catch (error) { await sendMessage(env, chatId, error instanceof Error ? error.message : 'Valor inválido'); return; }
  const oldKey = await semanticKey(op.ticket);
  op.ticket = candidate;
  op.status = 'Revisar';
  await updateTicket(env, op);
  await saveOperation(env, op);
  const newKey = await semanticKey(op.ticket);
  if (oldKey && oldKey !== newKey) await env.STATE.delete(oldKey);
  if (newKey) await env.STATE.put(newKey, op.id);
  await env.STATE.delete(`pending:${chatId}`);
  await sendMessage(env, chatId, `Corrección guardada: ${field} = ${value}. Operación ${op.id}.`, operationButtons(op.id));
}

async function handleCallback(env: Env, update: NonNullable<TelegramUpdate['callback_query']>): Promise<void> {
  const chatId = update.message?.chat.id;
  if (!chatId || !allowedChat(env, chatId) || update.from.id !== chatId) { await answerCallback(env, update.id, 'No autorizado'); return; }
  const [action, id] = (update.data ?? '').split(':');
  const op = id ? await env.STATE.get<Operation>(`op:${id}`, 'json') : null;
  if (!op || op.chatId !== chatId || !op.row || op.status === 'Eliminado') { await answerCallback(env, update.id, 'Registro no disponible'); return; }
  if (action === 'ok') { await answerCallback(env, update.id, 'Confirmado'); return; }
  if (action === 'edit') {
    await env.STATE.put(`pending:${chatId}`, id, { expirationTtl: 600 });
    await answerCallback(env, update.id, 'Envía la corrección');
    await sendMessage(env, chatId, 'Escribe campo=valor. Ejemplo: total=458.50. Campos: comercio, fecha, total, subtotal, iva, propina, categoria, metodo_pago.');
    return;
  }
  if (action === 'delete') {
    await moveToTrash(env, op.fileId);
    op.status = 'Eliminado';
    await updateTicket(env, op);
    await saveOperation(env, op);
    await env.STATE.delete(`hash:${op.hash}`);
    const key = await semanticKey(op.ticket);
    if (key) await env.STATE.delete(key);
    await answerCallback(env, update.id, 'Registro eliminado');
    await sendMessage(env, chatId, `La operación ${id} se marcó como Eliminado.`);
  }
}

async function processUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  if (!chatId) return;
  if (update.message && update.message.from?.id !== chatId) return; // Private chats only.
  if (!allowedChat(env, chatId)) {
    if (update.message) await sendMessage(env, chatId, 'Este bot es privado.');
    else if (update.callback_query) await answerCallback(env, update.callback_query.id, 'No autorizado');
    return;
  }
  try {
    if (update.callback_query) { await handleCallback(env, update.callback_query); return; }
    if (!update.message || await env.STATE.get(`update:${update.update_id}`)) return;
    if (update.message.photo?.length) {
      const photo = update.message.photo[update.message.photo.length - 1];
      await sendMessage(env, chatId, 'Procesando tu ticket… ⏳');
      await handlePhoto(env, chatId, update.message.from?.id ?? chatId, photo.file_id, update.update_id);
    } else if (update.message.text) {
      await handleText(env, chatId, update.message.text);
      await env.STATE.put(`update:${update.update_id}`, 'text', { expirationTtl: day });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message.match(/^HTTP \d+/)?.[0] ?? error.name : 'unknown';
    console.error('Ticket processing failed', { updateId: update.update_id, code });
    const message = error instanceof PartialSaveError ? error.message
      : error instanceof Error && error.message.includes('invalid_grant') ? 'Google necesita una nueva autorización. Avisa al administrador del bot.'
      : error instanceof Error && /^(La imagen supera el límite de 5 MB\.|No pude leer el total con suficiente confianza\.|Fecha inválida$)/.test(error.message) ? error.message
      : 'No pude procesar el ticket. Inténtalo de nuevo más tarde.';
    await sendMessage(env, chatId, message);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') return Response.json({ ok: true });
    if (url.pathname !== '/telegram' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    try { required(env); } catch { return new Response('Server not configured', { status: 503 }); }
    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET) return new Response('Unauthorized', { status: 401 });
    let update: TelegramUpdate;
    try { update = await request.json() as TelegramUpdate; } catch { return new Response('Invalid JSON', { status: 400 }); }
    if (!Number.isInteger(update.update_id)) return new Response('Invalid update', { status: 400 });
    ctx.waitUntil(processUpdate(env, update));
    return new Response('OK');
  },
};
