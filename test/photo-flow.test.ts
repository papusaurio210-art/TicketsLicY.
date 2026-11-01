import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import { fixture as storageFixture, png, sampleOperation } from './support';
import { getOperation, readTickets } from '../src/storage';
import type { Ticket } from '../src/types';
let current: Awaited<ReturnType<typeof storageFixture>>;
beforeEach(async () => {
  current = await storageFixture();
  current.env.ALLOWED_CHAT_IDS = '123,456';
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  await current.mf.dispose();
});
function fixture(override: Partial<Ticket> = {}) {
  const { env } = current;
  const calls: string[] = [],
    messages: string[] = [],
    markups: object[] = [];
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/sendMessage')) {
      const p = JSON.parse(String(init?.body));
      messages.push(p.text);
      if (p.reply_markup) markups.push(p.reply_markup);
      return Response.json({ ok: true, result: { message_id: 1 } });
    }
    if (url.endsWith('/answerCallbackQuery')) return Response.json({ ok: true, result: true });
    if (url.endsWith('/getFile'))
      return Response.json({
        ok: true,
        result: { file_path: 'photo.png', file_size: png.byteLength },
      });
    if (url.includes('/file/bot')) return new Response(png);
    if (url.includes('/v1/responses'))
      return Response.json({
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({ ...sampleOperation().ticket, ...override }),
              },
            ],
          },
        ],
      });
    throw Error('Unexpected external request');
  });
  async function send(update: object) {
    const pending: Promise<unknown>[] = [];
    const result = await worker.fetch(
      new Request('https://tickets.example/telegram', {
        method: 'POST',
        headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret' },
        body: JSON.stringify(update),
      }),
      env,
      {
        waitUntil: (p: Promise<unknown>) => {
          pending.push(p);
        },
      } as unknown as ExecutionContext,
    );
    await Promise.all(pending);
    return result;
  }
  const text = (id: number, value: string) =>
    send({
      update_id: id,
      message: { message_id: id, chat: { id: 123 }, from: { id: 123 }, text: value },
    });
  const callback = (id: number, data: string) =>
    send({
      update_id: id,
      callback_query: {
        id: String(id),
        from: { id: 123 },
        data,
        message: { chat: { id: 123 }, message_id: 1 },
      },
    });
  const photo = (id: number) =>
    send({
      update_id: id,
      message: {
        message_id: id,
        chat: { id: 123 },
        from: { id: 123 },
        photo: [{ file_id: 'photo' }],
      },
    });
  return { env, calls, messages, markups, send, text, callback, photo, fetchMock };
}
describe('flujo de foto en D1 y R2', () => {
  it('registra sin Google, detecta duplicados y no repite la extracción', async () => {
    const f = fixture();
    expect((await f.photo(1)).status).toBe(200);
    const rows = await readTickets(f.env);
    expect(rows).toHaveLength(1);
    const op = await getOperation(f.env, rows[0].operationId);
    expect(await f.env.TICKET_IMAGES!.head(op!.imageKey!)).not.toBeNull();
    await f.photo(2);
    expect(await readTickets(f.env)).toHaveLength(1);
    expect(f.messages.at(-1)).toContain('ya fue registrado');
    expect(f.calls.filter((x) => x.includes('/v1/responses'))).toHaveLength(1);
    expect(f.calls.every((x) => !x.includes('googleapis'))).toBe(true);
  });
  it('recupera la imagen temporal tras un fallo de D1 sin repetir OpenAI', async () => {
    const f = fixture();
    await readTickets(f.env);
    const original = f.env.ADMIN_DB!;
    let fail = true;
    f.env.ADMIN_DB = {
      prepare: original.prepare.bind(original),
      batch: async (statements) => {
        if (fail) {
          fail = false;
          throw Error('simulated D1 failure');
        }
        return original.batch(statements);
      },
    } as D1Database;
    await f.photo(10);
    expect(f.messages.at(-1)).toContain('guardada temporalmente');
    expect((await f.env.STATE.list({ prefix: 'cloud-stage:' })).keys).toHaveLength(1);
    await f.photo(11);
    expect(await readTickets(f.env)).toHaveLength(1);
    expect((await f.env.STATE.list({ prefix: 'cloud-stage:' })).keys).toHaveLength(0);
    expect(f.calls.filter((x) => x.includes('/v1/responses'))).toHaveLength(1);
  });
  it('corrige y elimina por botones, y la cancelación no modifica el registro', async () => {
    const f = fixture();
    await f.photo(20);
    const id = (await readTickets(f.env))[0].operationId;
    await f.callback(21, `edit:${id}`);
    expect(f.messages.at(-1)).toBe('¿Qué dato quieres corregir?');
    await f.callback(22, `field:${id}:total`);
    expect(JSON.stringify(f.markups.at(-1))).toContain(`cancel:${id}`);
    expect(f.messages.at(-1)).not.toContain('/cancelar');
    await f.callback(23, `cancel:${id}`);
    await f.text(24, '999');
    expect((await getOperation(f.env, id))!.ticket.total).toBe(116);
    await f.callback(25, `field:${id}:total`);
    await f.text(26, '117');
    expect((await getOperation(f.env, id))!.ticket.total).toBe(117);
    await f.callback(27, `delete:${id}`);
    expect((await getOperation(f.env, id))!.status).toBe('Eliminado');
    await f.text(28, '📊 Este mes');
    expect(f.messages.at(-1)).toContain('No hay tickets');
  });
  it('permite corregir el año sin mover ni exponer la imagen', async () => {
    const f = fixture({ fecha: '2025-10-21' });
    await f.photo(30);
    const id = (await readTickets(f.env))[0].operationId,
      key = (await getOperation(f.env, id))!.imageKey;
    await f.callback(31, `field:${id}:fecha`);
    await f.text(32, '21/10/2026');
    expect((await getOperation(f.env, id))!.ticket.fecha).toBe('2026-10-21');
    expect((await getOperation(f.env, id))!.imageKey).toBe(key);
    await f.callback(33, `ok:${id}`);
    expect((await getOperation(f.env, id))!.status).toBe('OK');
  });
  it('mantiene el menú, las búsquedas y la privacidad entre personas', async () => {
    const f = fixture();
    await f.photo(40);
    await f.text(41, '/start');
    expect(JSON.stringify(f.markups.at(-1))).toContain('is_persistent');
    await f.text(42, '🧾 Mis tickets');
    expect(f.messages.at(-1)).toContain('Mercado');
    await f.text(43, '🔎 Buscar');
    await f.text(44, 'mercado');
    expect(f.messages.at(-1)).toContain('Mercado');
    await f.text(45, '🔎 Buscar');
    await f.callback(46, 'search_cancel');
    expect(await f.env.STATE.get('search:123')).toBeNull();
    await f.send({
      update_id: 47,
      message: { message_id: 47, chat: { id: 456 }, from: { id: 456 }, text: '🧾 Mis tickets' },
    });
    expect(f.messages.at(-1)).toBe('No hay tickets registrados.');
  });
});
