import { sha256 } from './http';
import {
  StorageError,
  dailyCount,
  findDuplicate,
  getOperation,
  readTickets,
  restoreImage,
  saveNewTicket,
  storeImage,
  updateCompleted,
  updateTicket,
} from './storage';
import { extractTicket } from './openai';
import { monthTotals, searchTickets, ticketLine, visibleTickets } from './queries';
import { categories, validateTicket } from './ticket';
import { handleAdmin } from './admin';
import { hasBotAccess, requestAccess } from './admin-store';
import {
  answerCallback,
  cancelEditButton,
  cancelSearchButton,
  downloadPhoto,
  editButtons,
  mainMenu,
  menuLabels,
  operationButtons,
  sendMessage,
  ticketSummary,
} from './telegram';
import type { Env, Operation, TelegramUpdate, Ticket } from './types';

const day = 86_400;
const editFields = new Set<keyof Ticket>([
  'comercio',
  'fecha',
  'total',
  'subtotal',
  'iva',
  'propina',
  'categoria',
  'metodo_pago',
]);
type PendingEdit = { id: string; field: keyof Ticket };
const editLabels: Record<string, string> = {
  comercio: 'el comercio',
  fecha: 'la fecha',
  total: 'el total',
  subtotal: 'el subtotal',
  iva: 'el IVA',
  propina: 'la propina',
  categoria: 'la categoría',
  metodo_pago: 'el método de pago',
};

function correctionValue(field: keyof Ticket, input: string): string | number {
  const value = input.trim();
  if (field === 'fecha') {
    const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : value;
  }
  if (['total', 'subtotal', 'iva', 'propina'].includes(field)) {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(value))
      throw new Error('Escribe un importe válido, por ejemplo 458.50.');
    return Number(value.replace(',', '.'));
  }
  if (!value) throw new Error('Escribe un valor para guardar la corrección.');
  if (field === 'categoria')
    return (
      categories.find(
        (category) => category.toLocaleLowerCase('es') === value.toLocaleLowerCase('es'),
      ) ?? value
    );
  return value;
}

function required(env: Env): void {
  const names = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_WEBHOOK_SECRET',
    'OPENAI_API_KEY',
    'ADMIN_DB',
    'TICKET_IMAGES',
  ] as const;
  const missing = names.filter((name) => !env[name]);
  if (missing.length) throw new Error(`Falta configuración: ${missing.join(', ')}`);
}

function panelLink(env: Env): string {
  return `${env.PUBLIC_APP_URL || 'https://ticketslicy-bot.willicer1313.workers.dev'}/admin`;
}
async function handlePhoto(
  env: Env,
  chatId: number,
  userId: number,
  fileId: string,
  updateId: number,
): Promise<void> {
  if (await updateCompleted(env, updateId)) return;
  if ((await dailyCount(env, chatId)) >= 30)
    throw new StorageError('DAILY_LIMIT', 'Alcanzaste el límite diario de 30 tickets.', 429);
  const { bytes, mime } = await downloadPhoto(env, fileId),
    hash = await sha256(bytes);
  const duplicate = await findDuplicate(env, chatId, hash);
  if (duplicate) {
    if (!duplicate.imageKey) await restoreImage(env, duplicate, bytes);
    await sendMessage(
      env,
      chatId,
      'Este ticket ya fue registrado. Puedes consultarlo en el panel.',
    );
    return;
  }
  const stageKey = `cloud-stage:${chatId}:${hash}`;
  let op = await env.STATE.get<Operation>(stageKey, 'json');
  if (!op) {
    const { ticket, review } = await extractTicket(env, bytes, mime);
    if (await findDuplicate(env, chatId, hash, ticket)) {
      await sendMessage(
        env,
        chatId,
        'Este ticket ya fue registrado. Puedes consultarlo en el panel.',
      );
      return;
    }
    op = {
      id: crypto.randomUUID().replaceAll('-', '').slice(0, 16),
      hash,
      chatId,
      userId,
      imageKey: null,
      mime: null,
      createdAt: new Date().toISOString(),
      origin: 'native',
      ticket,
      status: review ? 'Revisar' : 'OK',
    };
    await env.STATE.put(stageKey, JSON.stringify(op), { expirationTtl: day * 7 });
  }
  if (!op.imageKey) {
    await storeImage(env, op, bytes);
    await env.STATE.put(stageKey, JSON.stringify(op), { expirationTtl: day * 7 });
  }
  const result = await saveNewTicket(env, op, updateId);
  await env.STATE.delete(stageKey);
  await sendMessage(
    env,
    chatId,
    result.created
      ? ticketSummary(result.op.ticket, result.op.status, panelLink(env))
      : 'Este ticket ya fue registrado. Puedes consultarlo en el panel.',
    operationButtons(result.op.id),
  );
}

async function handleQuery(
  env: Env,
  chatId: number,
  command: 'recent' | 'month' | 'search',
  argument = '',
): Promise<void> {
  if (command === 'month' && argument && !/^\d{4}-(0[1-9]|1[0-2])$/.test(argument)) {
    await sendMessage(env, chatId, 'Escribe el mes como AAAA-MM.');
    return;
  }
  const tickets = visibleTickets(await readTickets(env, chatId), chatId, undefined);
  if (command === 'recent') {
    await sendMessage(
      env,
      chatId,
      tickets.slice(0, 5).map(ticketLine).join('\n') || 'No hay tickets registrados.',
    );
  } else if (command === 'search') {
    const matches = searchTickets(tickets, argument);
    await sendMessage(
      env,
      chatId,
      matches.length
        ? `${matches.slice(0, 5).map(ticketLine).join('\n')}\nMostrando ${Math.min(matches.length, 5)} de ${matches.length}.`
        : 'No encontré tickets que coincidan.',
    );
  } else {
    const month = argument || new Date().toISOString().slice(0, 7);
    const totals = monthTotals(tickets, month);
    await sendMessage(
      env,
      chatId,
      totals.size
        ? [...totals]
            .map(([currency, total]) => `${month}: ${total.toFixed(2)} ${currency}`)
            .join('\n')
        : `No hay tickets para ${month}.`,
    );
  }
}

async function promptSearch(env: Env, chatId: number): Promise<void> {
  await env.STATE.put(`search:${chatId}`, '1', { expirationTtl: 600 });
  await sendMessage(
    env,
    chatId,
    '¿Qué ticket buscas? Escribe el comercio, folio, categoría o mes (AAAA-MM).',
    cancelSearchButton(),
  );
}

async function handleText(env: Env, chatId: number, text: string): Promise<void> {
  const input = text.trim();
  if (input.startsWith('/start')) {
    await env.STATE.delete(`pending:${chatId}`);
    await env.STATE.delete(`search:${chatId}`);
    await sendMessage(
      env,
      chatId,
      '📸 Envíame una foto clara de tu ticket o usa los botones para consultar tus registros.',
      mainMenu(),
    );
    return;
  }
  if (input === menuLabels.help || input.startsWith('/ayuda')) {
    await env.STATE.delete(`pending:${chatId}`);
    await env.STATE.delete(`search:${chatId}`);
    await sendMessage(
      env,
      chatId,
      'Usa los botones de abajo para ver tus tickets, consultar el mes o buscar. Para registrar uno nuevo, envía una foto. Si algún dato sale mal, toca Corregir en el ticket.',
      mainMenu(),
    );
    return;
  }
  if (input === menuLabels.newTicket) {
    await env.STATE.delete(`pending:${chatId}`);
    await env.STATE.delete(`search:${chatId}`);
    await sendMessage(env, chatId, '📸 Adjunta una foto clara del ticket.');
    return;
  }
  if (input === menuLabels.recent || input === menuLabels.month || input === menuLabels.search) {
    await env.STATE.delete(`pending:${chatId}`);
    await env.STATE.delete(`search:${chatId}`);
    if (input === menuLabels.search) await promptSearch(env, chatId);
    else await handleQuery(env, chatId, input === menuLabels.recent ? 'recent' : 'month');
    return;
  }
  if (input.startsWith('/cancelar')) {
    await env.STATE.delete(`pending:${chatId}`);
    await env.STATE.delete(`search:${chatId}`);
    await sendMessage(env, chatId, 'Acción cancelada.');
    return;
  }
  const command = input.split(/\s+/, 1)[0];
  if (command === '/ultimos' || command === '/total_mes' || command === '/buscar') {
    const argument = input.slice(command.length).trim();
    if (command === '/buscar' && !argument) await promptSearch(env, chatId);
    else
      await handleQuery(
        env,
        chatId,
        command === '/ultimos' ? 'recent' : command === '/buscar' ? 'search' : 'month',
        argument,
      );
    return;
  }
  if (await env.STATE.get(`search:${chatId}`)) {
    await env.STATE.delete(`search:${chatId}`);
    await handleQuery(env, chatId, 'search', input);
    return;
  }
  const pending = await env.STATE.get<PendingEdit>(`pending:${chatId}`, 'json');
  if (!pending || !pending.id || !editFields.has(pending.field)) {
    await sendMessage(env, chatId, '📸 Envíame una foto de un ticket o escribe /ayuda.');
    return;
  }
  const op = await getOperation(env, pending.id);
  if (!op || op.chatId !== chatId || op.status === 'Eliminado') {
    await env.STATE.delete(`pending:${chatId}`);
    return;
  }
  const field = pending.field;
  let value: string | number;
  try {
    value = correctionValue(field, text);
  } catch (error) {
    await sendMessage(env, chatId, error instanceof Error ? error.message : 'Valor inválido');
    return;
  }
  const candidate = { ...op.ticket, [field]: value };
  if (field === 'fecha')
    candidate.notas = candidate.notas?.replace(/revisar año[.,; ]*/gi, '').trim() || null;
  try {
    validateTicket(candidate);
  } catch (error) {
    await sendMessage(env, chatId, error instanceof Error ? error.message : 'Valor inválido');
    return;
  }
  op.ticket = candidate;
  op.status = 'Revisar';
  await updateTicket(env, op, `Telegram ${chatId}`);
  await env.STATE.delete(`pending:${chatId}`);
  const imageLink = panelLink(env);
  await sendMessage(
    env,
    chatId,
    `✅ Corrección guardada.\n${ticketSummary(op.ticket, op.status, imageLink)}`,
    operationButtons(op.id),
  );
}

async function handleCallback(
  env: Env,
  update: NonNullable<TelegramUpdate['callback_query']>,
): Promise<void> {
  const chatId = update.message?.chat.id;
  if (!chatId || !(await hasBotAccess(env, chatId)) || update.from.id !== chatId) {
    await answerCallback(env, update.id, 'No autorizado');
    return;
  }
  await env.STATE.delete(`search:${chatId}`);
  if (update.data === 'search_cancel') {
    await env.STATE.delete(`search:${chatId}`);
    await answerCallback(env, update.id, 'Búsqueda cancelada');
    await sendMessage(env, chatId, 'Búsqueda cancelada.');
    return;
  }
  const [action, id, field] = (update.data ?? '').split(':');
  const op = id ? await getOperation(env, id) : null;
  if (!op || op.chatId !== chatId || op.status === 'Eliminado') {
    await answerCallback(env, update.id, 'Registro no disponible');
    return;
  }
  if (action === 'ok') {
    await env.STATE.delete(`pending:${chatId}`);
    op.status = 'OK';
    await updateTicket(env, op, `Telegram ${chatId}`, 'ticket_confirm');
    await answerCallback(env, update.id, 'Ticket confirmado');
    return;
  }
  if (action === 'edit') {
    await env.STATE.delete(`pending:${chatId}`);
    await answerCallback(env, update.id, 'Elige el dato');
    await sendMessage(env, chatId, '¿Qué dato quieres corregir?', editButtons(op.id));
    return;
  }
  if (action === 'cancel') {
    const pending = await env.STATE.get<PendingEdit>(`pending:${chatId}`, 'json');
    if (pending?.id === id) await env.STATE.delete(`pending:${chatId}`);
    await answerCallback(env, update.id, 'Corrección cancelada');
    await sendMessage(env, chatId, 'Corrección cancelada.');
    return;
  }
  if (action === 'field' && editFields.has(field as keyof Ticket)) {
    await env.STATE.put(`pending:${chatId}`, JSON.stringify({ id, field }), { expirationTtl: 600 });
    await answerCallback(env, update.id, 'Escribe el nuevo valor');
    const example =
      field === 'fecha'
        ? ' Por ejemplo: 21/10/2026.'
        : field === 'categoria'
          ? ' Opciones: Alimentos, Transporte, Hospedaje, Insumos, Servicios u Otros.'
          : '';
    await sendMessage(
      env,
      chatId,
      `Escribe el nuevo valor de ${editLabels[field]}.${example}`,
      cancelEditButton(op.id),
    );
    return;
  }
  if (action === 'delete') {
    await env.STATE.delete(`pending:${chatId}`);
    op.status = 'Eliminado';
    await updateTicket(env, op, `Telegram ${chatId}`, 'ticket_delete');
    await answerCallback(env, update.id, 'Registro eliminado');
    await sendMessage(env, chatId, `La operación ${id} se marcó como Eliminado.`);
  }
}

async function processUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
  if (!chatId) return;
  if (update.message && update.message.from?.id !== chatId) return; // Private chats only.
  if (!(await hasBotAccess(env, chatId))) {
    const requester = update.message?.from ?? update.callback_query?.from;
    if (update.callback_query?.data === 'access_request' && requester?.id === chatId) {
      const saved = await requestAccess(
        env,
        chatId,
        requester.username ? `@${requester.username}` : (requester.first_name ?? String(chatId)),
      );
      await answerCallback(env, update.callback_query.id, 'Solicitud recibida');
      await sendMessage(
        env,
        chatId,
        saved
          ? 'Tu solicitud se revisará en el panel de administración.'
          : 'El administrador todavía está preparando los accesos. Inténtalo más tarde.',
      );
    } else if (update.message)
      await sendMessage(env, chatId, 'Necesitas autorización para usar este bot.', {
        inline_keyboard: [[{ text: 'Solicitar acceso', callback_data: 'access_request' }]],
      });
    else if (update.callback_query)
      await answerCallback(env, update.callback_query.id, 'No autorizado');
    return;
  }
  try {
    if (update.callback_query) {
      await handleCallback(env, update.callback_query);
      return;
    }
    if (!update.message || (await env.STATE.get(`update:${update.update_id}`))) return;
    if (update.message.photo?.length) {
      await env.STATE.delete(`pending:${chatId}`);
      await env.STATE.delete(`search:${chatId}`);
      const photo = update.message.photo[update.message.photo.length - 1];
      await sendMessage(env, chatId, 'Procesando tu ticket… ⏳');
      await handlePhoto(
        env,
        chatId,
        update.message.from?.id ?? chatId,
        photo.file_id,
        update.update_id,
      );
      await env.STATE.put(`update:${update.update_id}`, 'photo', { expirationTtl: day });
    } else if (update.message.text) {
      await handleText(env, chatId, update.message.text);
      await env.STATE.put(`update:${update.update_id}`, 'text', { expirationTtl: day });
    }
  } catch (error) {
    const code =
      error instanceof Error ? (error.message.match(/^HTTP \d+/)?.[0] ?? error.name) : 'unknown';
    console.error('Ticket processing failed', { updateId: update.update_id, code });
    const message =
      error instanceof StorageError
        ? error.message
        : error instanceof Error &&
            /^(La imagen supera el límite de 5 MB\.|No pude leer el total con suficiente confianza\.|Fecha inválida$)/.test(
              error.message,
            )
          ? error.message
          : 'No pude procesar el ticket. Inténtalo de nuevo más tarde.';
    await sendMessage(env, chatId, message);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/' && ['GET', 'HEAD'].includes(request.method))
      return new Response(null, { status: 302, headers: { Location: '/admin', 'Cache-Control': 'no-store' } });
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))
      return handleAdmin(request, env);
    if (url.pathname === '/health' && request.method === 'GET') return Response.json({ ok: true });
    if (url.pathname !== '/telegram' || request.method !== 'POST')
      return new Response('Not found', { status: 404 });
    try {
      required(env);
    } catch {
      return new Response('Server not configured', { status: 503 });
    }
    if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_WEBHOOK_SECRET)
      return new Response('Unauthorized', { status: 401 });
    let update: TelegramUpdate;
    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
    if (!Number.isInteger(update.update_id)) return new Response('Invalid update', { status: 400 });
    ctx.waitUntil(processUpdate(env, update));
    return new Response('OK');
  },
};
