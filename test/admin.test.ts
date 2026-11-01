/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Miniflare } from 'miniflare';
import { fixture, sampleOperation, png } from './support';
import { getOperation, readTickets, saveNewTicket, storeImage } from '../src/storage';
import { sha256 } from '../src/http';
import { handleAdmin } from '../src/admin';
import { hasBotAccess, requestAccess } from '../src/admin-store';
import type { Env, Operation } from '../src/types';

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
  const current = await fixture();
  mf = current.mf;
  env = current.env;
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
    const first = sampleOperation(123),
      second = sampleOperation(456);
    await storeImage(env, first, png);
    await storeImage(env, second, png);
    await saveNewTicket(env, first, 1001);
    await saveNewTicket(env, second, 1002);
    const tickets = (await (await call('tickets', undefined, session)).json()) as {
      userId: number;
    }[];
    expect(tickets.map((x) => x.userId)).toEqual([456]);

    expect((await call('tickets', { id: first.id, action: 'delete' }, session)).status).toBe(403);
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
  it('corrige y elimina un ticket en D1 y conserva la imagen privada para revisión', async () => {
    const op = sampleOperation();
    op.hash = await sha256(png);
    await storeImage(env, op, png);
    await saveNewTicket(env, op, 3000);
    expect(
      (await call('tickets', { id: op.id, action: 'edit', patch: { total: -1 } })).status,
    ).toBe(400);
    expect(
      (await call('tickets', { id: op.id, action: 'edit', patch: { total: 117 } })).status,
    ).toBe(200);
    expect((await getOperation(env, op.id))!.ticket.total).toBe(117);
    expect((await call('tickets/' + op.id + '/image')).status).toBe(200);
    expect((await call('tickets/' + op.id + '/image', undefined, '')).status).toBe(401);
    expect((await call('tickets', { id: op.id, action: 'delete' })).status).toBe(200);
    expect((await getOperation(env, op.id))!.status).toBe('Eliminado');
    expect(await env.TICKET_IMAGES!.head(op.imageKey!)).not.toBeNull();
    const actions = (
      await env
        .ADMIN_DB!.prepare('SELECT action FROM audit WHERE target=? ORDER BY id')
        .bind(op.id)
        .all<{ action: string }>()
    ).results.map((x) => x.action);
    expect(actions).toEqual(['ticket_create', 'ticket_edit', 'ticket_delete']);
  });
  it('impide que un usuario abra imágenes ajenas y que importe archivos como administrador', async () => {
    await call('users', {
      username: 'person',
      password: 'person-password-123',
      role: 'user',
      chatId: '456',
    });
    const session = await login('person', 'person-password-123');
    const op = sampleOperation(123);
    op.hash = await sha256(png);
    await storeImage(env, op, png);
    await saveNewTicket(env, op, 4000);
    expect((await call('tickets/' + op.id + '/image', undefined, session)).status).toBe(404);
    const response = await handleAdmin(
      new Request(origin + '/admin/api/import-images', {
        method: 'POST',
        headers: { 'Content-Type': 'image/png', Origin: origin, Cookie: session },
        body: png,
      }),
      env,
    );
    expect(response.status).toBe(403);
  });
  it('limita intentos de inicio de sesión', async () => {
    let result: Response;
    for (let i = 0; i < 16; i++)
      result = await call('login', { username: 'absent', password: 'wrong' }, '');
    expect(result!.status).toBe(429);
  });
});
