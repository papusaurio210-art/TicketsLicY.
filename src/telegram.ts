import { requestJson } from './http';
import type { Env, Ticket } from './types';

interface TelegramResult<T> { ok: boolean; result: T }

async function callTelegram<T>(env: Env, method: string, payload: object): Promise<T> {
  const data = await requestJson<TelegramResult<T>>(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  }, method === 'getFile' ? 2 : 0);
  if (!data.ok) throw new Error(`Telegram ${method} failed`);
  return data.result;
}

export function allowedChat(env: Env, chatId: number): boolean {
  return env.ALLOWED_CHAT_IDS.split(',').map(s => s.trim()).filter(Boolean).includes(String(chatId));
}

export function sendMessage(env: Env, chatId: number, text: string, replyMarkup?: object): Promise<{ message_id: number }> {
  return callTelegram(env, 'sendMessage', { chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) });
}

export async function answerCallback(env: Env, id: string, text: string): Promise<void> {
  await callTelegram(env, 'answerCallbackQuery', { callback_query_id: id, text });
}

export async function downloadPhoto(env: Env, fileId: string): Promise<{ bytes: ArrayBuffer; mime: string }> {
  const file = await callTelegram<{ file_path: string; file_size?: number }>(env, 'getFile', { file_id: fileId });
  if (file.file_size && file.file_size > 5_000_000) throw new Error('La imagen supera el límite de 5 MB.');
  const response = await fetch(`https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`);
  if (!response.ok) throw new Error(`Telegram file HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 5_000_000) throw new Error('La imagen supera el límite de 5 MB.');
  const mime = file.file_path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { bytes, mime };
}

export function ticketSummary(ticket: Ticket, status: string, link: string): string {
  return `${status}: ${ticket.comercio}\nFecha: ${ticket.fecha}\nTotal: ${ticket.total?.toFixed(2)} ${ticket.moneda}\nIVA: ${ticket.iva?.toFixed(2) ?? 'N/D'}\nCategoría: ${ticket.categoria}\nImagen: ${link}`;
}

export function operationButtons(id: string): object {
  return { inline_keyboard: [[
    { text: '✅ Correcto', callback_data: `ok:${id}` },
    { text: '✏️ Corregir', callback_data: `edit:${id}` },
    { text: '🗑 Eliminar', callback_data: `delete:${id}` },
  ]] };
}
