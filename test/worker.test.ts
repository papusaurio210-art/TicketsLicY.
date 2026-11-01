import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types';
import { fixture } from './support';
let current: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => {
  current = await fixture();
});
afterEach(async () => {
  await current.mf.dispose();
});

function env(): Env {
  return current.env;
}

describe('Worker', () => {
  it('dirige al panel y retira las páginas creadas para la integración anterior', async () => {
    const e = env();
    const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;
    for (const method of ['GET','HEAD']) {
      const response = await worker.fetch(new Request('https://example.com/',{method}),e,ctx);
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/admin');
      expect(await response.text()).toBe('');
    }
    for (const path of ['/privacy','/public.css']) {
      expect((await worker.fetch(new Request('https://example.com'+path),e,ctx)).status).toBe(404);
    }
    const panel = await worker.fetch(new Request('https://example.com/admin'),e,ctx);
    expect(panel.status).toBe(200);
    expect((await panel.text())).toContain('TicketsLicY');
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });
  it('responde en health y protege el webhook', async () => {
    const e = env();
    const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;
    expect((await worker.fetch(new Request('http://localhost/health'), e, ctx)).status).toBe(200);
    expect(
      (
        await worker.fetch(
          new Request('http://localhost/telegram', { method: 'POST', body: '{}' }),
          e,
          ctx,
        )
      ).status,
    ).toBe(401);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  it('acepta un update válido y atiende /ayuda', async () => {
    const e = env();
    const pending: Promise<unknown>[] = [];
    const ctx = {
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    } as unknown as ExecutionContext;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }),
      );
    try {
      const response = await worker.fetch(
        new Request('http://localhost/telegram', {
          method: 'POST',
          headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret' },
          body: JSON.stringify({
            update_id: 1,
            message: { message_id: 1, chat: { id: 123 }, from: { id: 123 }, text: '/ayuda' },
          }),
        }),
        e,
        ctx,
      );
      expect(response.status).toBe(200);
      await Promise.all(pending);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toContain('/sendMessage');
      const group = await worker.fetch(
        new Request('http://localhost/telegram', {
          method: 'POST',
          headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret' },
          body: JSON.stringify({
            update_id: 2,
            message: { message_id: 2, chat: { id: 123 }, from: { id: 999 }, text: '/ayuda' },
          }),
        }),
        e,
        ctx,
      );
      expect(group.status).toBe(200);
      await Promise.all(pending);
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('recibe al usuario con una instrucción breve para enviar la foto', async () => {
    const e = env();
    const pending: Promise<unknown>[] = [];
    const ctx = {
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    } as unknown as ExecutionContext;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ ok: true, result: { message_id: 1 } }));
    try {
      await worker.fetch(
        new Request('http://localhost/telegram', {
          method: 'POST',
          headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret' },
          body: JSON.stringify({
            update_id: 3,
            message: { message_id: 3, chat: { id: 123 }, from: { id: 123 }, text: '/start' },
          }),
        }),
        e,
        ctx,
      );
      await Promise.all(pending);
      const message = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).text;
      expect(message).toContain('Envíame una foto clara');
      expect(message).not.toContain('/buscar');
    } finally {
      fetchMock.mockRestore();
    }
  });
});
