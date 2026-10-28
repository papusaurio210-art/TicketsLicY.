/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFileSync } from 'node:fs';
import { handleAdmin } from '../src/admin';
import { hasBotAccess, requestAccess } from '../src/admin-store';
import type { Env, Operation } from '../src/types';
import { semanticKey } from '../src/ticket';

let mf: Miniflare,
  env: Env,
  cookie = '',
  recovery: string[];
const origin = 'https://tickets.example';
async function call(path: string, body?: object, session = cookie, source = origin) {
  return handleAdmin(
    new Request(origin + '/admin/api/' + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json', Origin: source } : {}),
        ...(session ? { Cookie: session } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
  );
}
async function login(username = 'owner', password = 'owner-password-123') {
  const result = await call('login', { username, password }, '');
  expect(result.status).toBe(200);
  return result.headers.get('set-cookie')!.split(';')[0];
}
beforeEach(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("ok")}}',
      compatibilityDate: '2026-10-20',
      d1Databases: ['ADMIN_DB'],
      kvNamespaces: ['STATE'],
    }),
  );
  const db = await mf.getD1Database('ADMIN_DB');
  for (const sql of readFileSync('migrations/0001_admin.sql', 'utf8')
    .split(';')
    .filter((x) => x.trim()))
    await db.prepare(sql).run();
  env = {
    ADMIN_DB: db as unknown as D1Database,
    STATE: (await mf.getKVNamespace('STATE')) as unknown as KVNamespace,
    ADMIN_SETUP_TOKEN: 'a'.repeat(64),
    ALLOWED_CHAT_IDS: '123',
    TELEGRAM_BOT_TOKEN: 'bot',
    TELEGRAM_WEBHOOK_SECRET: 'secret',
    OPENAI_API_KEY: 'key',
    OPENAI_MODEL: 'test',
    GOOGLE_CLIENT_ID: 'id',
    GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_REFRESH_TOKEN: 'refresh',
    GOOGLE_FOLDER_ID: 'folder',
    GOOGLE_SHEET_ID: 'sheet',
    GOOGLE_TRASH_FOLDER_ID: 'trash',
  };
  cookie = '';
  const setup = await call('setup', {
    token: 'a'.repeat(64),
    username: 'owner',
    password: 'owner-password-123',
  });
  expect(setup.status).toBe(200);
  recovery = ((await setup.json()) as { recoveryCodes: string[] }).recoveryCodes;
  cookie = await login();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await mf?.dispose();
});

describe('panel con D1 real', () => {
  it('protege instalación, contraseñas, cookies y origen de los cambios', async () => {
    expect(
      (
        await call('setup', {
          token: 'a'.repeat(64),
          username: 'other',
          password: 'other-password-123',
        })
      ).status,
    ).toBe(409);
    const stored = await env
      .ADMIN_DB!.prepare('SELECT password_hash FROM users WHERE username=?')
      .bind('owner')
      .first<{ password_hash: string }>();
    expect(stored!.password_hash).not.toContain('owner-password-123');
    expect(
      (await call('login', { username: 'owner', password: 'wrong-password' }, '')).status,
    ).toBe(401);
    expect(
      (
        await call(
          'users',
          { username: 'intruder', password: 'password-long-123', role: 'admin' },
          cookie,
          'https://evil.example',
        )
      ).status,
    ).toBe(403);
    expect((await call('users', undefined, '')).status).toBe(401);
    const result = await call('login', { username: 'owner', password: 'owner-password-123' }, '');
    expect(result.headers.get('set-cookie')).toContain('Secure; HttpOnly; SameSite=Strict');
    expect((await call('status')).headers.get('content-security-policy')).toContain(
      "frame-ancestors 'none'",
    );
  });
  it('aprueba y revoca Telegram desde el panel sin que la lista antigua reabra el acceso', async () => {
    expect(await hasBotAccess(env, 456)).toBe(false);
    await requestAccess(env, 456, 'Persona');
    expect((await (await call('requests')).json()) as unknown[]).toHaveLength(1);
    expect((await call('requests', { chatId: '456', action: 'approve' })).status).toBe(200);
    expect(await hasBotAccess(env, 456)).toBe(true);
    env.ALLOWED_CHAT_IDS = '123,456';
    expect((await call('access', { chatId: '456', status: 'revoked' })).status).toBe(200);
    expect(await hasBotAccess(env, 456)).toBe(false);
    expect((await call('access', { chatId: '123', status: 'revoked' })).status).toBe(403);
    expect(await hasBotAccess(env, 123)).toBe(true);
  });
  it('limita cada usuario a sus tickets y revoca sesiones al suspenderlo', async () => {
    expect(
      (
        await call('users', {
          username: 'person',
          password: 'person-password-123',
          role: 'user',
          chatId: '456',
        })
      ).status,
    ).toBe(200);
    const session = await login('person', 'person-password-123');
    for (const path of ['users', 'requests', 'access', 'audit'])
      expect((await call(path, undefined, session)).status).toBe(403);
    const headers = [
      'Fecha captura',
      'Fecha ticket',
      'Comercio',
      'RFC',
      'Folio',
      'Moneda',
      'Subtotal',
      'IVA',
      'Propina',
      'Total',
      'Método de pago',
      'Categoría',
      'Confianza',
      'Estado',
      'Link Drive',
      'Quién lo envió',
      'ID de operación',
      'Hash',
    ];
    const row = (id: number) => [
      '',
      '2026-10-21',
      'Shop',
      '',
      '',
      'MXN',
      100,
      16,
      0,
      116,
      'Tarjeta',
      'Insumos',
      0.9,
      'OK',
      '',
      id,
      'op-' + id,
      'hash',
    ];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input).includes('oauth2')
        ? Response.json({ access_token: 'test-token', expires_in: 3600 })
        : Response.json({ values: [headers, row(123), row(456)] }),
    );
    const tickets = (await (await call('tickets', undefined, session)).json()) as {
      userId: number;
    }[];
    expect(tickets.map((x) => x.userId)).toEqual([456]);
    await env.STATE.put('op:other', JSON.stringify({ id: 'other', status: 'OK', chatId: 123 }));
    expect((await call('tickets', { id: 'other', action: 'delete' }, session)).status).toBe(403);
    const users = (await (await call('users')).json()) as { id: string; username: string }[];
    const target = users.find((x) => x.username === 'person')!;
    expect((await call('users/' + target.id, { active: false })).status).toBe(200);
    expect((await call('me', undefined, session)).status).toBe(401);
    expect(await hasBotAccess(env, 456)).toBe(false);
  });
  it('recupera la cuenta sin correo con un código de un solo uso y cierra sesiones', async () => {
    expect(
      (await call('recover', { code: recovery[0], password: 'new-owner-password' }, '')).status,
    ).toBe(200);
    expect((await call('me')).status).toBe(401);
    expect(
      (await call('recover', { code: recovery[0], password: 'newer-password-123' }, '')).status,
    ).toBe(403);
    await login('owner', 'new-owner-password');
  });
  it('corrige y elimina un ticket, actualiza deduplicación y deja historial', async () => {
    const op: Operation = {
      id: 'demo',
      hash: 'image-hash',
      chatId: 123,
      userId: 123,
      fileId: 'image',
      row: 2,
      status: 'OK',
      ticket: {
        comercio: 'Mercado',
        fecha: '2026-10-21',
        folio: 'abc',
        rfc_emisor: null,
        hora: null,
        moneda: 'MXN',
        subtotal: 100,
        iva: 16,
        propina: 0,
        total: 116,
        metodo_pago: 'Tarjeta',
        ultimos_4_tarjeta: null,
        categoria: 'Insumos',
        confianza: 0.95,
        notas: null,
      },
    };
    await env.STATE.put('op:demo', JSON.stringify(op));
    await env.STATE.put('hash:image-hash', 'demo');
    const oldKey = (await semanticKey(op.ticket))!;
    await env.STATE.put(oldKey, 'demo');
    const updates: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes('oauth2'))
        return Response.json({ access_token: 'test-token', expires_in: 3600 });
      if (url.includes('fields=parents')) return Response.json({ parents: ['folder'] });
      if (url.includes('/values/')) updates.push(JSON.parse(String(init?.body)).values);
      return Response.json({});
    });
    expect(
      (await call('tickets', { id: 'demo', action: 'edit', patch: { total: -1 } })).status,
    ).toBe(400);
    expect(
      (await call('tickets', { id: 'demo', action: 'edit', patch: { total: 117 } })).status,
    ).toBe(200);
    const updated = await env.STATE.get<Operation>('op:demo', 'json');
    expect(updated!.ticket.total).toBe(117);
    expect(await env.STATE.get(oldKey)).toBeNull();
    expect(await env.STATE.get((await semanticKey(updated!.ticket))!)).toBe('demo');
    expect(updates).toHaveLength(1);
    expect((await call('tickets', { id: 'demo', action: 'delete' })).status).toBe(200);
    expect((await env.STATE.get<Operation>('op:demo', 'json'))!.status).toBe('Eliminado');
    expect(await env.STATE.get('hash:image-hash')).toBeNull();
    const actions = (
      await env
        .ADMIN_DB!.prepare("SELECT action FROM audit WHERE target='demo' ORDER BY id")
        .all<{ action: string }>()
    ).results.map((x) => x.action);
    expect(actions).toEqual(['ticket_edit', 'ticket_delete']);
  });
  it('limita intentos de inicio de sesión', async () => {
    let result: Response;
    for (let i = 0; i < 16; i++)
      result = await call('login', { username: 'absent', password: 'wrong' }, '');
    expect(result!.status).toBe(429);
  });
});
