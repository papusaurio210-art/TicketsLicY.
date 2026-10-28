import type { Env, Operation, Ticket } from './types';
import {
  audit,
  credentials,
  digest,
  initialized,
  limited,
  passwordHash,
  randomToken,
  safeEqual,
  sessionAccount,
  verifyPassword,
  type Account,
} from './admin-store';
import { adminHtml, adminJs, adminCss } from './admin-ui';
import { readTickets, updateTicket, relocateImage, moveToTrash } from './google';
import { semanticKey, validateTicket } from './ticket';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
const cookie = (value: string, age: number) =>
  `__Host-session=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
function publicUser(u: Account) {
  return { id: u.id, username: u.username, role: u.role, active: u.active, owner: u.owner };
}
const validChat = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d{0,15}$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  )
    throw new ApiError(400, 'ID de Telegram inválido.');
  return value;
};
function admin(user: Account) {
  if (user.role !== 'admin') throw new ApiError(403, 'Solo el administrador puede hacer esto.');
}

async function routes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname;
  if (request.method === 'GET' && (path === '/admin' || path === '/admin/'))
    return new Response(adminHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  if (request.method === 'GET' && path === '/admin/app.js')
    return new Response(adminJs, { headers: { 'content-type': 'text/javascript; charset=utf-8' } });
  if (request.method === 'GET' && path === '/admin/style.css')
    return new Response(adminCss, { headers: { 'content-type': 'text/css; charset=utf-8' } });
  if (!path.startsWith('/admin/api/')) throw new ApiError(404, 'No encontrado.');
  if (!env.ADMIN_DB)
    throw new ApiError(503, 'El panel aún necesita su base de datos. El bot sigue disponible.');
  const db = env.ADMIN_DB;
  let body: Record<string, unknown> = {};
  if (request.method !== 'GET') {
    if (request.method !== 'POST') throw new ApiError(405, 'Método no permitido.');
    if (request.headers.get('Origin') !== url.origin)
      throw new ApiError(403, 'Origen no permitido.');
    if (!request.headers.get('Content-Type')?.startsWith('application/json'))
      throw new ApiError(400, 'Formato no permitido.');
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let text = '', size = 0;
    if (reader) {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 8192) { await reader.cancel(); throw new ApiError(413, 'Solicitud demasiado grande.'); }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    }
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError(400, 'Solicitud inválida.');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new ApiError(400, 'Solicitud inválida.');
  }
  if (path === '/admin/api/status' && request.method === 'GET')
    return json({ initialized: await initialized(env), setupAvailable: !!env.ADMIN_SETUP_TOKEN });
  if (path === '/admin/api/setup' && request.method === 'POST') {
    if (await limited(request, env, 'setup'))
      throw new ApiError(429, 'Demasiados intentos. Espera 15 minutos.');
    if (await initialized(env)) throw new ApiError(409, 'La cuenta principal ya está creada.');
    if (
      !env.ADMIN_SETUP_TOKEN ||
      env.ADMIN_SETUP_TOKEN.length < 32 ||
      typeof body.token !== 'string' ||
      !safeEqual(body.token, env.ADMIN_SETUP_TOKEN)
    )
      throw new ApiError(403, 'Código de instalación incorrecto.');
    const value = credentials(body.username, body.password),
      id = crypto.randomUUID();
    const hash = await passwordHash(value.password),
      codes = [randomToken(), randomToken(), randomToken()];
    const chats = [
      ...new Set(
        (env.ALLOWED_CHAT_IDS ?? '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ];
    if (!chats.length || chats.some((x) => !/^[1-9]\d{0,15}$/.test(x)))
      throw new ApiError(
        503,
        'Configura el ID inicial de Telegram del propietario antes de crear la cuenta principal.',
      );
    const statements = [
      db.prepare("INSERT INTO settings(key,value) VALUES('initialized','1')"),
      db
        .prepare("INSERT INTO users(id,username,password_hash,role,owner) VALUES(?,?,?,'admin',1)")
        .bind(id, value.username, hash),
    ];
    for (const [i, chat] of chats.entries())
      statements.push(
        db
          .prepare(
            "INSERT INTO bot_access(chat_id,user_id,display_name,status) VALUES(?,?,?,'active')",
          )
          .bind(chat, i === 0 ? id : null, i === 0 ? value.username : 'Usuario existente'),
      );
    for (const code of codes)
      statements.push(
        db
          .prepare('INSERT INTO recovery_codes(hash,user_id) VALUES(?,?)')
          .bind(await digest(code), id),
      );
    statements.push(audit(env, value.username, 'setup', id));
    await db.batch(statements);
    return json({ recoveryCodes: codes });
  }
  if (path === '/admin/api/login' && request.method === 'POST') {
    if (await limited(request, env, 'login'))
      throw new ApiError(429, 'Demasiados intentos. Espera 15 minutos.');
    const name = typeof body.username === 'string' ? body.username.toLowerCase() : '';
    const user = await db
      .prepare('SELECT * FROM users WHERE username=?')
      .bind(name)
      .first<Account>();
    const pass =
      typeof body.password === 'string' && body.password.length <= 128 ? body.password : '';
    // Perform the same expensive operation for unknown accounts.
    const verified = await verifyPassword(
      pass,
      user?.password_hash ?? `pbkdf2$100000$${'0'.repeat(64)}$${'0'.repeat(64)}`,
    );
    if (!user || !user.active || !verified)
      throw new ApiError(401, 'Usuario o contraseña incorrectos.');
    const token = randomToken();
    await db.batch([
      db.prepare('DELETE FROM sessions WHERE expires<?').bind(Date.now()),
      db
        .prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES(?,?,?)')
        .bind(await digest(token), user.id, Date.now() + 8 * 3600000),
      audit(env, user.username, 'login', user.id),
    ]);
    const response = json(publicUser(user));
    response.headers.set('Set-Cookie', cookie(token, 8 * 3600));
    return response;
  }
  if (path === '/admin/api/recover' && request.method === 'POST') {
    if (await limited(request, env, 'recover'))
      throw new ApiError(429, 'Demasiados intentos. Espera 15 minutos.');
    const { password } = credentials('recovery', body.password);
    if (typeof body.code !== 'string') throw new ApiError(400, 'Código incorrecto.');
    const hash = await passwordHash(password);
    const row = await db
      .prepare('DELETE FROM recovery_codes WHERE hash=? RETURNING user_id')
      .bind(await digest(body.code))
      .first<{ user_id: string }>();
    if (!row) throw new ApiError(403, 'Código incorrecto o ya utilizado.');
    await db.batch([
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(hash, row.user_id),
      db.prepare('DELETE FROM sessions WHERE user_id=?').bind(row.user_id),
      audit(env, 'recovery', 'password_reset', row.user_id),
    ]);
    return json({ ok: true });
  }
  const user = await sessionAccount(request, env);
  if (!user) throw new ApiError(401, 'Inicia sesión para continuar.');
  if (path === '/admin/api/me' && request.method === 'GET') return json(publicUser(user));
  if (path === '/admin/api/logout' && request.method === 'POST') {
    await db
      .prepare('DELETE FROM sessions WHERE token_hash=?')
      .bind(
        await digest(
          request.headers
            .get('cookie')
            ?.split(';')
            .map((x) => x.trim())
            .find((x) => x.startsWith('__Host-session='))
            ?.slice(15) ?? '',
        ),
      )
      .run();
    const response = json({ ok: true });
    response.headers.set('Set-Cookie', cookie('', 0));
    return response;
  }
  if (path === '/admin/api/password' && request.method === 'POST') {
    if (await limited(request, env, `password:${user.id}`))
      throw new ApiError(429, 'Demasiados intentos.');
    if (
      typeof body.currentPassword !== 'string' ||
      !(await verifyPassword(body.currentPassword, user.password_hash))
    )
      throw new ApiError(403, 'La contraseña actual no coincide.');
    const { password } = credentials(user.username, body.password);
    await db.batch([
      db
        .prepare('UPDATE users SET password_hash=? WHERE id=?')
        .bind(await passwordHash(password), user.id),
      db.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id),
      audit(env, user.username, 'password_change', user.id),
    ]);
    return json({ ok: true });
  }
  if (path === '/admin/api/users') {
    admin(user);
    if (request.method === 'GET')
      return json(
        (
          await db
            .prepare(
              'SELECT u.id,u.username,u.role,u.active,u.owner,b.chat_id FROM users u LEFT JOIN bot_access b ON b.user_id=u.id ORDER BY u.created_at',
            )
            .all()
        ).results,
      );
    const value = credentials(body.username, body.password),
      id = crypto.randomUUID();
    if (body.role !== 'admin' && body.role !== 'user') throw new ApiError(400, 'Rol inválido.');
    const statements = [
      db
        .prepare('INSERT INTO users(id,username,password_hash,role) VALUES(?,?,?,?)')
        .bind(id, value.username, await passwordHash(value.password), body.role),
    ];
    if (body.chatId) {
      const chat = validChat(body.chatId);
      statements.push(
        db.prepare('DELETE FROM bot_access WHERE chat_id=? AND user_id IS NULL').bind(chat),
      );
      statements.push(
        db
          .prepare(
            "INSERT INTO bot_access(chat_id,user_id,display_name,status) VALUES(?,?,?,'active')",
          )
          .bind(chat, id, value.username),
      );
    }
    statements.push(audit(env, user.username, 'user_create', value.username));
    await db.batch(statements);
    return json({ ok: true });
  }
  if (path.startsWith('/admin/api/users/') && request.method === 'POST') {
    admin(user);
    const id = path.slice('/admin/api/users/'.length);
    const target = await db.prepare('SELECT * FROM users WHERE id=?').bind(id).first<Account>();
    if (!target) throw new ApiError(404, 'Usuario no encontrado.');
    if (target.owner || target.id === user.id)
      throw new ApiError(
        403,
        'Usa Mi cuenta para cambiar tu contraseña. La cuenta principal está protegida.',
      );
    const statements: D1PreparedStatement[] = [];
    if (typeof body.active === 'boolean')
      statements.push(
        db.prepare('UPDATE users SET active=? WHERE id=?').bind(body.active ? 1 : 0, id),
      );
    if (body.password !== undefined)
      statements.push(
        db
          .prepare('UPDATE users SET password_hash=? WHERE id=?')
          .bind(await passwordHash(credentials(target.username, body.password).password), id),
      );
    if (!statements.length) throw new ApiError(400, 'No hay cambios.');
    statements.push(
      db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id),
      audit(env, user.username, body.password ? 'password_reset' : 'user_status', target.username),
    );
    await db.batch(statements);
    return json({ ok: true });
  }
  if (path === '/admin/api/access') {
    admin(user);
    if (request.method === 'GET')
      return json(
        (
          await db
            .prepare(
              'SELECT b.*,u.owner,u.username,u.active AS account_active FROM bot_access b LEFT JOIN users u ON u.id=b.user_id ORDER BY b.display_name',
            )
            .all()
        ).results,
      );
    const chat = validChat(body.chatId);
    if (body.status !== 'active' && body.status !== 'revoked')
      throw new ApiError(400, 'Estado inválido.');
    const target = await db
      .prepare('SELECT u.owner FROM bot_access b JOIN users u ON u.id=b.user_id WHERE b.chat_id=?')
      .bind(chat)
      .first<{ owner: number }>();
    if (target?.owner) throw new ApiError(403, 'El acceso del propietario está protegido.');
    await db.batch([
      db
        .prepare(
          'INSERT INTO bot_access(chat_id,display_name,status) VALUES(?,?,?) ON CONFLICT(chat_id) DO UPDATE SET status=excluded.status',
        )
        .bind(chat, String(body.name ?? chat).slice(0, 100), body.status),
      audit(env, user.username, `bot_${body.status}`, chat),
    ]);
    return json({ ok: true });
  }
  if (path === '/admin/api/requests') {
    admin(user);
    if (request.method === 'GET')
      return json(
        (
          await db
            .prepare(
              "SELECT * FROM access_requests WHERE status='pending' ORDER BY requested_at DESC",
            )
            .all()
        ).results,
      );
    const chat = validChat(body.chatId);
    if (body.action !== 'approve' && body.action !== 'reject')
      throw new ApiError(400, 'Acción inválida.');
    const pending = await db
      .prepare("SELECT display_name FROM access_requests WHERE chat_id=? AND status='pending'")
      .bind(chat)
      .first<{ display_name: string }>();
    if (!pending) throw new ApiError(404, 'Solicitud no encontrada.');
    const statements = [
      db
        .prepare('UPDATE access_requests SET status=? WHERE chat_id=?')
        .bind(body.action === 'approve' ? 'approved' : 'rejected', chat),
    ];
    if (body.action === 'approve')
      statements.push(
        db
          .prepare(
            "INSERT INTO bot_access(chat_id,display_name,status) VALUES(?,?,'active') ON CONFLICT(chat_id) DO UPDATE SET status='active'",
          )
          .bind(chat, pending.display_name),
      );
    statements.push(audit(env, user.username, `request_${body.action}`, chat));
    await db.batch(statements);
    return json({ ok: true });
  }
  if (path === '/admin/api/audit' && request.method === 'GET') {
    admin(user);
    return json((await db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all()).results);
  }
  if (path === '/admin/api/tickets') {
    if (request.method === 'GET') {
      const own = await db
        .prepare('SELECT chat_id FROM bot_access WHERE user_id=?')
        .bind(user.id)
        .first<{ chat_id: string }>();
      return json(
        (await readTickets(env)).filter(
          (t) => user.role === 'admin' || String(t.userId) === own?.chat_id,
        ),
      );
    }
    const id = typeof body.id === 'string' ? body.id : '';
    const op = await env.STATE.get<Operation>(`op:${id}`, 'json');
    if (!op || op.status === 'Eliminado') throw new ApiError(404, 'Ticket no disponible.');
    const own = await db
      .prepare('SELECT chat_id FROM bot_access WHERE user_id=?')
      .bind(user.id)
      .first<{ chat_id: string }>();
    if (user.role !== 'admin' && String(op.chatId) !== own?.chat_id)
      throw new ApiError(403, 'Sin permiso para este ticket.');
    const oldKey = await semanticKey(op.ticket),
      oldDate = op.ticket.fecha;
    if (body.action === 'delete') {
      await moveToTrash(env, op.fileId);
      op.status = 'Eliminado';
    } else if (body.action === 'edit') {
      const patch = body.patch as Partial<Ticket>;
      if (
        !patch ||
        typeof patch !== 'object' ||
        Object.keys(patch).some((k) => !['fecha', 'total', 'comercio', 'categoria'].includes(k))
      )
        throw new ApiError(400, 'Datos inválidos.');
      const candidate = { ...op.ticket, ...patch };
      validateTicket(candidate);
      op.ticket = candidate;
      op.status = 'Revisar';
      if (op.ticket.fecha !== oldDate) await relocateImage(env, op);
    } else throw new ApiError(400, 'Acción inválida.');
    await updateTicket(env, op);
    await env.STATE.put(`op:${id}`, JSON.stringify(op));
    if (oldKey) await env.STATE.delete(oldKey);
    if (op.status === 'Eliminado') await env.STATE.delete(`hash:${op.hash}`);
    else {
      const key = await semanticKey(op.ticket);
      if (key) await env.STATE.put(key, id);
    }
    await audit(env, user.username, `ticket_${body.action}`, id).run();
    return json({ ok: true });
  }
  throw new ApiError(404, 'No encontrado.');
}

export async function handleAdmin(request: Request, env: Env): Promise<Response> {
  let response: Response;
  try {
    response = await routes(request, env);
  } catch (error) {
    if (error instanceof ApiError) response = json({ error: error.message }, error.status);
    else if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) response = json({ error: 'Ese usuario o ID de Telegram ya está asignado.' }, 409);
    else if (
      error instanceof Error &&
      /^(Usa un nombre|La contraseña|Fecha inválida|Falta el comercio|Categoría inválida|total inválido|No pude leer)/.test(
        error.message,
      )
    )
      response = json({ error: error.message }, 400);
    else {
      console.error('Admin request failed', { path: new URL(request.url).pathname });
      response = json(
        { error: 'No se pudo completar. Comprueba los datos y vuelve a intentar.' },
        500,
      );
    }
  }
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
