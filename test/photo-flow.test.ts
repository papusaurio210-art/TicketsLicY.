import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env, Ticket } from '../src/types';

const ticket: Ticket = {
  comercio: 'Mercado', rfc_emisor: null, fecha: new Date().toISOString().slice(0, 10), hora: null, folio: null,
  moneda: 'MXN', subtotal: 100, iva: 16, propina: 0, total: 116,
  metodo_pago: 'Tarjeta', ultimos_4_tarjeta: '1234', categoria: 'Insumos', confianza: 0.95, notas: null,
};

function fixture(override: Partial<Ticket> = {}) {
  const state = new Map<string, string>();
  const env = {
    STATE: {
      get: async (key: string, kind?: string) => {
        const value = state.get(key);
        return value && kind === 'json' ? JSON.parse(value) : value ?? null;
      },
      put: async (key: string, value: string) => { state.set(key, value); },
      delete: async (key: string) => { state.delete(key); },
    } as unknown as KVNamespace,
    TELEGRAM_BOT_TOKEN: 'bot', TELEGRAM_WEBHOOK_SECRET: 'secret', ALLOWED_CHAT_IDS: '123,456',
    OPENAI_API_KEY: 'key', OPENAI_MODEL: 'model', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_REFRESH_TOKEN: 'refresh', GOOGLE_FOLDER_ID: 'root', GOOGLE_SHEET_ID: 'sheet', GOOGLE_TRASH_FOLDER_ID: 'trash',
  } satisfies Env;
  const calls: string[] = [];
  const messages: string[] = [];
  const markups: object[] = [];
  let uploadedHash = '';
  let sheetHasRow = false;
  let failAppendOnce = false;
  const sheetRows: unknown[][] = [['Fecha captura', 'Fecha ticket', 'Comercio', 'RFC', 'Folio', 'Moneda', 'Subtotal', 'IVA', 'Propina', 'Total', 'Método de pago', 'Categoría', 'Confianza', 'Estado', 'Link Drive', 'Quién lo envió', 'ID de operación', 'Hash']];
  const json = (data: unknown, status = 200) => Response.json(data, { status });
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/sendMessage')) {
      const payload = JSON.parse(String(init?.body));
      messages.push(payload.text);
      if (payload.reply_markup) markups.push(payload.reply_markup);
      return json({ ok: true, result: { message_id: 1 } });
    }
    if (url.endsWith('/answerCallbackQuery')) return json({ ok: true, result: true });
    if (url.endsWith('/getFile')) return json({ ok: true, result: { file_path: 'photos/photo.jpg', file_size: 4 } });
    if (url.includes('/file/bot')) return new Response(new Uint8Array([1, 2, 3, 4]));
    if (url.includes('/v1/responses')) return json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ ...ticket, ...override }) }] }] });
    if (url.includes('oauth2.googleapis.com/token')) return json({ access_token: 'token', expires_in: 3600 });
    if (url.includes('/drive/v3/files?q=')) return json({ files: [] });
    if (url.includes('/drive/v3/files?fields=id')) return json({ id: 'folder' });
    if (url.includes('/upload/drive/v3/files')) return json({ id: 'image', webViewLink: 'https://drive.google.com/file/d/image/view' });
    if (url.includes('/drive/v3/files/image?fields=parents')) return json({ parents: ['folder'], mimeType: 'image/jpeg' });
    if (url.includes('/drive/v3/files/image?addParents=')) return json({ id: 'image' });
    if (url.endsWith('/drive/v3/files/image') && init?.method === 'PATCH') return json({ id: 'image' });
    if (url.includes('/values/Tickets!R:R')) return json({ values: sheetHasRow ? [['Hash'], [uploadedHash]] : [['Hash']] });
    if (url.includes('/values/Tickets!A1:R?')) return json({ values: sheetRows });
    if (url.includes('/values/Tickets!B2:N2')) {
      sheetRows[1].splice(1, 13, ...JSON.parse(String(init?.body)).values[0]);
      return json({ updatedRange: 'Tickets!B2:N2' });
    }
    if (url.includes(':append')) {
      const body = JSON.parse(String(init?.body));
      uploadedHash = body.values[0][17];
      sheetHasRow = true;
      sheetRows.push(body.values[0]);
      if (failAppendOnce) { failAppendOnce = false; throw new Error('connection lost after append'); }
      return json({ updates: { updatedRange: 'Tickets!A2:R2' } });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  async function send(update: object) {
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => pending.push(promise) } as unknown as ExecutionContext;
    const response = await worker.fetch(new Request('http://localhost/telegram', {
      method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret' },
      body: JSON.stringify(update),
    }), env, ctx);
    await Promise.all(pending);
    return response;
  }
  const photo = (updateId: number) => send({ update_id: updateId, message: { message_id: updateId, chat: { id: 123 }, from: { id: 123 }, photo: [{ file_id: 'photo' }] } });
  return { state, calls, messages, markups, fetchMock, photo, send, failNextAppend: () => { failAppendOnce = true; } };
}

describe('flujo de foto', () => {
  it('registra la imagen y la fila, y detecta un segundo envío', async () => {
    const f = fixture();
    try {
      expect((await f.photo(1)).status).toBe(200);
      expect([...f.state.keys()].some(key => key.startsWith('hash:'))).toBe(true);
      expect(f.calls.filter(url => url.includes(':append'))).toHaveLength(1);
      await f.photo(2);
      expect(f.calls.filter(url => url.includes(':append'))).toHaveLength(1);
      expect(f.calls.filter(url => url.includes('/upload/drive/v3/files'))).toHaveLength(1);
    } finally { f.fetchMock.mockRestore(); }
  });

  it('recupera una fila creada cuando se pierde la respuesta de Sheets', async () => {
    const f = fixture();
    f.failNextAppend();
    try {
      await f.photo(10);
      expect([...f.state.keys()].some(key => key.startsWith('stage:'))).toBe(true);
      expect(f.messages.some(message => message.includes('no pude confirmar la fila en Sheets'))).toBe(true);
      await f.photo(11);
      expect(f.calls.filter(url => url.includes(':append'))).toHaveLength(1);
      expect(f.calls.filter(url => url.includes('/upload/drive/v3/files'))).toHaveLength(1);
      expect([...f.state.keys()].some(key => key.startsWith('hash:'))).toBe(true);
    } finally { f.fetchMock.mockRestore(); }
  });

  it('corrige un importe y elimina el registro mediante botones', async () => {
    const f = fixture();
    try {
      await f.photo(20);
      const id = [...f.state.keys()].find(key => key.startsWith('op:'))!.slice(3);
      await f.send({ update_id: 24, message: { message_id: 24, chat: { id: 123 }, from: { id: 123 }, text: '/total_mes' } });
      expect(f.messages.at(-1)).toContain('116.00 MXN');
      await f.send({ update_id: 21, callback_query: { id: 'callback1', from: { id: 123 }, data: `edit:${id}`, message: { chat: { id: 123 }, message_id: 1 } } });
      expect(f.messages.at(-1)).toBe('¿Qué dato quieres corregir?');
      expect(JSON.stringify(f.markups.at(-1))).toContain(`field:${id}:total`);
      await f.send({ update_id: 26, callback_query: { id: 'callback3', from: { id: 123 }, data: `field:${id}:total`, message: { chat: { id: 123 }, message_id: 1 } } });
      await f.send({ update_id: 22, message: { message_id: 22, chat: { id: 123 }, from: { id: 123 }, text: '117' } });
      expect(JSON.parse(f.state.get(`op:${id}`)!).ticket.total).toBe(117);
      await f.send({ update_id: 23, callback_query: { id: 'callback2', from: { id: 123 }, data: `delete:${id}`, message: { chat: { id: 123 }, message_id: 1 } } });
      expect(JSON.parse(f.state.get(`op:${id}`)!).status).toBe('Eliminado');
      expect(f.calls.some(url => url.includes('/drive/v3/files/image?addParents='))).toBe(true);
      await f.send({ update_id: 25, message: { message_id: 25, chat: { id: 123 }, from: { id: 123 }, text: '/total_mes' } });
      expect(f.messages.at(-1)).toBe(`No hay tickets para ${new Date().toISOString().slice(0, 7)}.`);
    } finally { f.fetchMock.mockRestore(); }
  });

  it('señala un año sospechoso y permite corregir la fecha con un mensaje sencillo', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T18:00:00Z'));
    const f = fixture({ fecha: '2025-10-21' });
    try {
      await f.photo(40);
      const id = [...f.state.keys()].find(key => key.startsWith('op:'))!.slice(3);
      expect(f.messages.at(-1)).toContain('Revisa el año');
      await f.send({ update_id: 41, callback_query: { id: 'edit-date', from: { id: 123 }, data: `edit:${id}`, message: { chat: { id: 123 }, message_id: 1 } } });
      await f.send({ update_id: 42, callback_query: { id: 'select-date', from: { id: 123 }, data: `field:${id}:fecha`, message: { chat: { id: 123 }, message_id: 1 } } });
      expect(f.messages.at(-1)).toContain('21/10/2026');
      await f.send({ update_id: 43, message: { message_id: 43, chat: { id: 123 }, from: { id: 123 }, text: '21/10/2026' } });
      expect(JSON.parse(f.state.get(`op:${id}`)!).ticket.fecha).toBe('2026-10-21');
      expect(f.calls.some(url => url.endsWith('/drive/v3/files/image') || url.includes('/drive/v3/files/image?addParents='))).toBe(true);
      expect(f.messages.at(-1)).toContain('Fecha: 21/10/2026');
      expect(f.messages.at(-1)).not.toContain('Revisa el año');
      await f.send({ update_id: 44, callback_query: { id: 'confirm-date', from: { id: 123 }, data: `ok:${id}`, message: { chat: { id: 123 }, message_id: 1 } } });
      expect(JSON.parse(f.state.get(`op:${id}`)!).status).toBe('OK');
    } finally { f.fetchMock.mockRestore(); vi.useRealTimers(); }
  });

  it('cancela con el botón junto al mensaje que pide el valor', async () => {
    const f = fixture();
    try {
      await f.photo(50);
      const id = [...f.state.keys()].find(key => key.startsWith('op:'))!.slice(3);
      await f.send({ update_id: 51, callback_query: { id: 'edit', from: { id: 123 }, data: `edit:${id}`, message: { chat: { id: 123 }, message_id: 1 } } });
      await f.send({ update_id: 52, callback_query: { id: 'field', from: { id: 123 }, data: `field:${id}:total`, message: { chat: { id: 123 }, message_id: 2 } } });
      expect(f.messages.at(-1)).not.toContain('/cancelar');
      expect(f.markups.at(-1)).toEqual({ inline_keyboard: [[{ text: 'Cancelar', callback_data: `cancel:${id}` }]] });
      expect(f.state.has('pending:123')).toBe(true);
      await f.send({ update_id: 53, callback_query: { id: 'cancel', from: { id: 123 }, data: `cancel:${id}`, message: { chat: { id: 123 }, message_id: 3 } } });
      expect(f.state.has('pending:123')).toBe(false);
      expect(f.messages.at(-1)).toBe('Corrección cancelada.');
      await f.send({ update_id: 54, message: { message_id: 54, chat: { id: 123 }, from: { id: 123 }, text: '999' } });
      expect(JSON.parse(f.state.get(`op:${id}`)!).ticket.total).toBe(116);
    } finally { f.fetchMock.mockRestore(); }
  });

  it('busca en Sheets y no muestra a otro usuario los tickets ajenos', async () => {
    const f = fixture();
    try {
      await f.photo(30);
      await f.send({ update_id: 31, message: { message_id: 31, chat: { id: 123 }, from: { id: 123 }, text: '/buscar mercado' } });
      expect(f.messages.at(-1)).toContain('Mercado');
      await f.send({ update_id: 32, message: { message_id: 32, chat: { id: 456 }, from: { id: 456 }, text: '/buscar mercado' } });
      expect(f.messages.at(-1)).toBe('No encontré tickets que coincidan.');
    } finally { f.fetchMock.mockRestore(); }
  });
});
