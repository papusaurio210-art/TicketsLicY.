import { describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types';

function env(): Env {
  const data = new Map<string, string>();
  return {
    STATE: {
      get: vi.fn(async (key: string) => data.get(key) ?? null),
      put: vi.fn(async (key: string, value: string) => { data.set(key, value); }),
      delete: vi.fn(async (key: string) => { data.delete(key); }),
    } as unknown as KVNamespace,
    TELEGRAM_BOT_TOKEN: 'test', TELEGRAM_WEBHOOK_SECRET: 'secret', ALLOWED_CHAT_IDS: '123',
    OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test', GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test',
    GOOGLE_REFRESH_TOKEN: 'test', GOOGLE_FOLDER_ID: 'test', GOOGLE_SHEET_ID: 'test', GOOGLE_TRASH_FOLDER_ID: 'test',
  };
}

describe('Worker', () => {
  it('publica información y privacidad sin consultar datos privados ni exponer secretos', async () => {
    const e = env();
    e.GOOGLE_REFRESH_TOKEN = 'private-token-must-not-appear';
    e.PUBLIC_SUPPORT_EMAIL = 'support@example.com';
    const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;
    const network = vi.spyOn(globalThis, 'fetch');
    try {
      for (const path of ['/', '/privacy']) {
        const response = await worker.fetch(new Request('https://example.com'+path), e, ctx);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toContain('text/html');
        const html = await response.text();
        expect(html).toContain('support@example.com');
        expect(html).not.toContain(e.GOOGLE_REFRESH_TOKEN);
      }
      expect(network).not.toHaveBeenCalled();
      expect(ctx.waitUntil).not.toHaveBeenCalled();
      const head = await worker.fetch(new Request('https://example.com/privacy', {method:'HEAD'}),e,ctx);
      expect(head.status).toBe(200);
      expect(await head.text()).toBe('');
    } finally { network.mockRestore(); }
  });
  it('responde en health y protege el webhook', async () => {
    const e = env();
    const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;
    expect((await worker.fetch(new Request('http://localhost/health'), e, ctx)).status).toBe(200);
    expect((await worker.fetch(new Request('http://localhost/telegram', { method: 'POST', body: '{}' }), e, ctx)).status).toBe(401);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
  });

  it('acepta un update válido y atiende /ayuda', async () => {
    const e = env();
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => pending.push(promise) } as unknown as ExecutionContext;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }));
    try {
      const response = await worker.fetch(new Request('http://localhost/telegram', {
        method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret' },
        body: JSON.stringify({ update_id: 1, message: { message_id: 1, chat: { id: 123 }, from: { id: 123 }, text: '/ayuda' } }),
      }), e, ctx);
      expect(response.status).toBe(200);
      await Promise.all(pending);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock.mock.calls[0][0]).toContain('/sendMessage');
      const group = await worker.fetch(new Request('http://localhost/telegram', {
        method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret' },
        body: JSON.stringify({ update_id: 2, message: { message_id: 2, chat: { id: 123 }, from: { id: 999 }, text: '/ayuda' } }),
      }), e, ctx);
      expect(group.status).toBe(200);
      await Promise.all(pending);
      expect(fetchMock).toHaveBeenCalledOnce();
    } finally { fetchMock.mockRestore(); }
  });

  it('recibe al usuario con una instrucción breve para enviar la foto', async () => {
    const e = env();
    const pending: Promise<unknown>[] = [];
    const ctx = { waitUntil: (promise: Promise<unknown>) => pending.push(promise) } as unknown as ExecutionContext;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ok: true, result: { message_id: 1 } }));
    try {
      await worker.fetch(new Request('http://localhost/telegram', {
        method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 'secret' },
        body: JSON.stringify({ update_id: 3, message: { message_id: 3, chat: { id: 123 }, from: { id: 123 }, text: '/start' } }),
      }), e, ctx);
      await Promise.all(pending);
      const message = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).text;
      expect(message).toContain('Envíame una foto clara');
      expect(message).not.toContain('/buscar');
    } finally { fetchMock.mockRestore(); }
  });
});
