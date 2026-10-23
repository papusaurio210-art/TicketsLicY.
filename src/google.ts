import { requestJson } from './http';
import type { Env, Operation, Ticket } from './types';
import { parseTickets, type SheetTicket } from './queries';

let tokenCache: { token: string; expires: number } | undefined;

async function accessToken(env: Env): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now()) return tokenCache.token;
  const body = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' });
  const data = await requestJson<{ access_token: string; expires_in: number }>('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
  });
  tokenCache = { token: data.access_token, expires: Date.now() + Math.min(data.expires_in - 120, 3300) * 1000 };
  return data.access_token;
}

async function google<T>(env: Env, url: string, init: RequestInit): Promise<T> {
  const token = await accessToken(env);
  return requestJson<T>(url, { ...init, headers: { authorization: `Bearer ${token}`, ...init.headers } }, init.method && init.method !== 'GET' ? 0 : 2);
}

async function ensureFolder(env: Env, parent: string, name: string): Promise<string> {
  const query = encodeURIComponent(`name = '${name}' and '${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const existing = await google<{ files: Array<{ id: string }> }>(env, `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&spaces=drive`, {});
  if (existing.files.length) return existing.files[0].id;
  const folder = await google<{ id: string }>(env, 'https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  });
  return folder.id;
}

export async function uploadImage(env: Env, bytes: ArrayBuffer, mime: string, ticket: Ticket, hash: string): Promise<{ id: string; link: string }> {
  const [year, month] = ticket.fecha.split('-');
  const yearId = await ensureFolder(env, env.GOOGLE_FOLDER_ID, year);
  const monthId = await ensureFolder(env, yearId, month);
  const name = `${ticket.fecha}_${ticket.comercio.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 40)}_${ticket.total}_${hash.slice(0, 8)}.${mime === 'image/png' ? 'png' : 'jpg'}`;
  const boundary = `ticket_${crypto.randomUUID()}`;
  const meta = JSON.stringify({ name, parents: [monthId], mimeType: mime });
  const prefix = new TextEncoder().encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`);
  const suffix = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(prefix.byteLength + bytes.byteLength + suffix.byteLength);
  body.set(prefix); body.set(new Uint8Array(bytes), prefix.byteLength); body.set(suffix, prefix.byteLength + bytes.byteLength);
  const uploaded = await google<{ id: string; webViewLink?: string }>(env, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST', headers: { 'content-type': `multipart/related; boundary=${boundary}` }, body,
  });
  return { id: uploaded.id, link: uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view` };
}

export const headers = ['Fecha captura', 'Fecha ticket', 'Comercio', 'RFC', 'Folio', 'Moneda', 'Subtotal', 'IVA', 'Propina', 'Total', 'Método de pago', 'Categoría', 'Confianza', 'Estado', 'Link Drive', 'Quién lo envió', 'ID de operación', 'Hash'];

function rowValues(op: Operation, link: string): Array<string | number> {
  const t = op.ticket;
  return [new Date().toISOString(), t.fecha, t.comercio, t.rfc_emisor ?? '', t.folio ?? '', t.moneda,
    t.subtotal ?? '', t.iva ?? '', t.propina ?? '', t.total ?? '', t.metodo_pago ?? '', t.categoria,
    t.confianza, op.status, link, op.userId, op.id, op.hash];
}

export async function appendTicket(env: Env, op: Operation, link: string): Promise<number> {
  const result = await google<{ updates: { updatedRange: string } }>(env, `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/Tickets!A:R:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: [rowValues(op, link)] }),
  });
  const match = result.updates.updatedRange.match(/!A(\d+)/);
  if (!match) throw new Error('Google Sheets no devolvió el número de fila');
  return Number(match[1]);
}

export async function findRowByHash(env: Env, hash: string): Promise<number | null> {
  const result = await google<{ values?: string[][] }>(env, `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/Tickets!R:R`, {});
  const index = result.values?.findIndex(row => row[0] === hash) ?? -1;
  return index >= 0 ? index + 1 : null;
}

export async function readTickets(env: Env): Promise<SheetTicket[]> {
  const result = await google<{ values?: unknown[][] }>(env, `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/Tickets!A1:R?valueRenderOption=UNFORMATTED_VALUE`, {});
  return parseTickets(result.values ?? []);
}

export async function updateTicket(env: Env, op: Operation): Promise<void> {
  const columnValues = [op.ticket.fecha, op.ticket.comercio, op.ticket.rfc_emisor ?? '', op.ticket.folio ?? '', op.ticket.moneda,
    op.ticket.subtotal ?? '', op.ticket.iva ?? '', op.ticket.propina ?? '', op.ticket.total ?? '', op.ticket.metodo_pago ?? '',
    op.ticket.categoria, op.ticket.confianza, op.status];
  await google(env, `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEET_ID}/values/Tickets!B${op.row}:N${op.row}?valueInputOption=RAW`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values: [columnValues] }),
  });
}

export async function moveToTrash(env: Env, fileId: string): Promise<void> {
  if (!env.GOOGLE_TRASH_FOLDER_ID) return;
  const file = await google<{ parents?: string[] }>(env, `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {});
  const removeParents = (file.parents ?? []).join(',');
  await google(env, `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${env.GOOGLE_TRASH_FOLDER_ID}&removeParents=${removeParents}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}',
  });
}
