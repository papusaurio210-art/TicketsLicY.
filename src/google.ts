import { requestJson, UpstreamHttpError } from './http';
import type { Env, Operation, Ticket } from './types';
import { parseTickets, type SheetTicket } from './queries';

type GoogleStage = 'authorization' | 'sheets' | 'drive';
export class GoogleIntegrationError extends Error {
  constructor(readonly code: string, message: string, readonly stage: GoogleStage, readonly upstreamStatus?: number) {
    super(message);
    this.name = 'GoogleIntegrationError';
  }
}
export class GoogleAuthorizationError extends GoogleIntegrationError {
  constructor() {
    super('GOOGLE_AUTH_REQUIRED', 'La conexión con Google necesita una nueva autorización. El administrador debe restablecerla para consultar los tickets.', 'authorization', 400);
  }
}
function googleFailure(error: unknown, stage: GoogleStage): GoogleIntegrationError {
  if (error instanceof GoogleIntegrationError) return error;
  const upstream = error instanceof UpstreamHttpError ? error : undefined;
  if (stage === 'authorization') {
    if (upstream?.serviceCode === 'invalid_grant') return new GoogleAuthorizationError();
    if (['invalid_client', 'unauthorized_client'].includes(upstream?.serviceCode ?? '')) return new GoogleIntegrationError('GOOGLE_CLIENT_INVALID', 'Google rechazó el cliente OAuth. Revisa que GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET del Worker correspondan al mismo cliente con el que generaste el refresh token.', stage, upstream?.status);
    if (upstream?.serviceCode === 'invalid_scope') return new GoogleIntegrationError('GOOGLE_SCOPE_MISSING', 'La autorización de Google tiene permisos incorrectos. Autoriza Drive y Sheets con el cliente OAuth del bot.', stage, upstream?.status);
  }
  if (upstream?.status === 403) {
    if (['ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'insufficientPermissions'].includes(upstream.reason ?? '')) return new GoogleIntegrationError('GOOGLE_SCOPE_MISSING', 'El token no tiene los permisos necesarios. Vuelve a autorizar Drive y Sheets y actualiza GOOGLE_REFRESH_TOKEN.', stage, 403);
    if (['SERVICE_DISABLED', 'accessNotConfigured'].includes(upstream.reason ?? '')) return new GoogleIntegrationError('GOOGLE_API_DISABLED', 'La API de Google está deshabilitada. Habilita Google Drive API y Google Sheets API en el proyecto del cliente OAuth.', stage, 403);
    return new GoogleIntegrationError('GOOGLE_PERMISSION_DENIED', 'La cuenta autorizada no tiene permiso sobre el archivo. Revisa la cuenta de Google y el acceso a la hoja y carpeta configuradas.', stage, 403);
  }
  if (stage === 'sheets' && upstream?.status === 404) return new GoogleIntegrationError('GOOGLE_SHEET_NOT_FOUND', 'Google no encuentra la hoja configurada o no permite verla. Revisa GOOGLE_SHEET_ID y la cuenta que autorizaste.', stage, 404);
  if (stage === 'sheets' && upstream?.status === 400) return new GoogleIntegrationError('GOOGLE_SHEET_INVALID', 'Google no puede leer la hoja configurada. Revisa GOOGLE_SHEET_ID y que exista la pestaña Tickets.', stage, 400);
  return new GoogleIntegrationError('GOOGLE_UNAVAILABLE', 'No se pudo conectar con Google. Reintenta en unos momentos; el administrador puede revisar el diagnóstico de la conexión.', stage, upstream?.status);
}
export async function recordGoogleStatus(env: Env, error: GoogleIntegrationError | null): Promise<void> {
  if (!env.ADMIN_DB) return;
  const status = { code: error?.code ?? 'OK', stage: error?.stage ?? 'sheets', upstreamStatus: error ? error.upstreamStatus ?? null : 200, checkedAt: new Date().toISOString() };
  try {
    await env.ADMIN_DB.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('google_connection_status', JSON.stringify(status)).run();
  } catch { console.error('Google diagnostic storage unavailable'); }
}
let tokenCache: { token: string; expires: number; clientId: string; clientSecret: string; refreshToken: string } | undefined;
async function accessToken(env: Env): Promise<string> {
  const clientId = env.GOOGLE_CLIENT_ID?.trim(), clientSecret = env.GOOGLE_CLIENT_SECRET?.trim(), refreshToken = env.GOOGLE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) throw new GoogleIntegrationError('GOOGLE_CONFIG_MISSING', 'Falta configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN en el Worker.', 'authorization');
  if (tokenCache && tokenCache.expires > Date.now() && tokenCache.clientId === clientId && tokenCache.clientSecret === clientSecret && tokenCache.refreshToken === refreshToken) return tokenCache.token;
  try {
    const data = await requestJson<{ access_token: string; expires_in: number }>('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    });
    if (!data.access_token || !Number.isFinite(data.expires_in)) throw new Error('Invalid Google token response');
    tokenCache = { token: data.access_token, expires: Date.now() + Math.min(data.expires_in - 120, 3300) * 1000, clientId, clientSecret, refreshToken };
    return data.access_token;
  } catch (error) { tokenCache = undefined; throw googleFailure(error, 'authorization'); }
}
async function google<T>(env: Env, url: string, init: RequestInit): Promise<T> {
  const stage = new URL(url).hostname === 'sheets.googleapis.com' ? 'sheets' : 'drive';
  try {
    let token = await accessToken(env);
    const send = () => requestJson<T>(url, { ...init, headers: { authorization: `Bearer ${token}`, ...init.headers } }, init.method && init.method !== 'GET' ? 0 : 2);
    try { return await send(); } catch (error) {
      if (!(error instanceof UpstreamHttpError) || error.status !== 401) throw error;
      tokenCache = undefined; token = await accessToken(env);
      return await send();
    }
  } catch (error) { throw googleFailure(error, stage); }
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

export async function relocateImage(env: Env, op: Operation): Promise<void> {
  const [year, month] = op.ticket.fecha.split('-');
  const yearId = await ensureFolder(env, env.GOOGLE_FOLDER_ID, year);
  const monthId = await ensureFolder(env, yearId, month);
  const file = await google<{ parents?: string[]; mimeType?: string }>(env, `https://www.googleapis.com/drive/v3/files/${op.fileId}?fields=parents,mimeType`, {});
  const removeParents = (file.parents ?? []).join(',');
  const mime = file.mimeType === 'image/png' ? 'png' : 'jpg';
  const name = `${op.ticket.fecha}_${op.ticket.comercio.replace(/[^\p{L}\p{N}-]+/gu, '_').slice(0, 40)}_${op.ticket.total}_${op.hash.slice(0, 8)}.${mime}`;
  const location = file.parents?.includes(monthId) ? '' : `?addParents=${monthId}&removeParents=${removeParents}`;
  await google(env, `https://www.googleapis.com/drive/v3/files/${op.fileId}${location}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }),
  });
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
  const sheetId = env.GOOGLE_SHEET_ID?.trim();
  if (!sheetId || !/^[a-zA-Z0-9_-]+$/.test(sheetId)) throw new GoogleIntegrationError('GOOGLE_SHEET_INVALID', 'Revisa GOOGLE_SHEET_ID: debe contener solo el ID de la hoja, no el enlace completo.', 'sheets');
  const result = await google<{ values?: unknown[][] }>(env, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Tickets!A1:R?valueRenderOption=UNFORMATTED_VALUE`, {});
  let tickets: SheetTicket[];
  try { tickets = parseTickets(result.values ?? []); }
  catch { throw new GoogleIntegrationError('GOOGLE_SHEET_HEADERS_INVALID', 'La hoja Tickets tiene columnas distintas a las esperadas. El administrador debe revisar sus encabezados; no se modificó el archivo.', 'sheets'); }
  await recordGoogleStatus(env, null);
  return tickets;
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
