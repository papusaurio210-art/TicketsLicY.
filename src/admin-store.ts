import type { Env } from './types';
import { allowedChat } from './telegram';

export interface Account {
  id: string;
  username: string;
  role: 'admin' | 'user';
  active: number;
  owner: number;
  password_hash: string;
}
const encoder = new TextEncoder();
export async function digest(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}
function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export function randomToken(): string {
  return hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}
export async function passwordHash(password: string, salt = randomToken()): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2$100000$${salt}$${hex(hash)}`;
}
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2' || parts[1] !== '100000') return false;
  return safeEqual(await passwordHash(password, parts[2]), stored);
}
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export function credentials(
  username: unknown,
  password: unknown,
): { username: string; password: string } {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,32}$/.test(username))
    throw new Error('Usa un nombre de 3 a 32 letras, números, puntos o guiones.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 128)
    throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  return { username: username.toLowerCase(), password };
}
export async function initialized(env: Env): Promise<boolean> {
  return !!(await env
    .ADMIN_DB!.prepare("SELECT value FROM settings WHERE key='initialized'")
    .first());
}
export async function hasBotAccess(env: Env, chatId: number): Promise<boolean> {
  if (!env.ADMIN_DB || !(await initialized(env))) return allowedChat(env, chatId);
  const row = await env.ADMIN_DB.prepare(
    'SELECT b.status, u.active FROM bot_access b LEFT JOIN users u ON u.id=b.user_id WHERE b.chat_id=?',
  )
    .bind(String(chatId))
    .first<{ status: string; active: number | null }>();
  return row?.status === 'active' && row.active !== 0;
}
export async function requestAccess(env: Env, chatId: number, name: string): Promise<boolean> {
  if (!env.ADMIN_DB || !(await initialized(env))) return false;
  await env.ADMIN_DB.prepare(
    "INSERT INTO access_requests(chat_id,display_name,status) VALUES(?,?,'pending') ON CONFLICT(chat_id) DO UPDATE SET display_name=excluded.display_name,status='pending',requested_at=CURRENT_TIMESTAMP WHERE access_requests.status!='pending' AND access_requests.requested_at < datetime('now','-1 day')",
  )
    .bind(String(chatId), name.slice(0, 100))
    .run();
  return true;
}
export async function sessionAccount(request: Request, env: Env): Promise<Account | null> {
  const token = request.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('__Host-session='))
    ?.slice(15);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return env
    .ADMIN_DB!.prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.active=1',
    )
    .bind(await digest(token), Date.now())
    .first<Account>();
}
export async function limited(request: Request, env: Env, bucket: string): Promise<boolean> {
  const key = await digest(`${request.headers.get('CF-Connecting-IP') || 'local'}:${bucket}`);
  const now = Date.now();
  const row = await env
    .ADMIN_DB!.prepare(
      'INSERT INTO login_limits(key,attempts,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING attempts',
    )
    .bind(key, now + 900000, now, now)
    .first<{ attempts: number }>();
  return !row || row.attempts > 15;
}
export function audit(
  env: Env,
  actor: string,
  action: string,
  target: string,
): D1PreparedStatement {
  return env
    .ADMIN_DB!.prepare('INSERT INTO audit(actor,action,target) VALUES(?,?,?)')
    .bind(actor, action, target);
}
