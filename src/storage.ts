import type { Env, Operation, Ticket } from './types';
import { semanticKey, validateTicket } from './ticket';
import { sha256 } from './http';
import type { TicketRecord } from './queries';

export class StorageError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 503,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
export function database(env: Env): D1Database {
  if (!env.ADMIN_DB)
    throw new StorageError(
      'STORAGE_NOT_CONFIGURED',
      'Falta vincular la base de datos del sistema.',
    );
  return env.ADMIN_DB;
}
function bucket(env: Env): R2Bucket {
  if (!env.TICKET_IMAGES)
    throw new StorageError(
      'STORAGE_NOT_CONFIGURED',
      'Falta vincular el almacenamiento privado de imágenes.',
    );
  return env.TICKET_IMAGES;
}
type Row = {
  id: string;
  hash: string;
  chat_id: string;
  user_id: string;
  data: string;
  status: Operation['status'];
  image_key: string | null;
  mime: string | null;
  created_at: string;
  origin: Operation['origin'];
  legacy_order: number;
};
function operation(row: Row): Operation {
  return {
    id: row.id,
    hash: row.hash,
    chatId: Number(row.chat_id),
    userId: Number(row.user_id),
    ticket: JSON.parse(row.data),
    status: row.status,
    imageKey: row.image_key,
    mime: row.mime,
    createdAt: row.created_at,
    origin: row.origin,
  };
}
export function imageMime(bytes: ArrayBuffer): string {
  const v = new Uint8Array(bytes);
  if (v[0] === 0xff && v[1] === 0xd8 && v[2] === 0xff) return 'image/jpeg';
  if (v.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => v[i] === x))
    return 'image/png';
  throw new StorageError('IMAGE_INVALID', 'Selecciona una imagen JPG o PNG válida.', 400);
}
export async function importLegacyBatch(
  env: Env,
): Promise<{ done: boolean; imported: number; warnings: number }> {
  const db = database(env),
    previous = await db
      .prepare("SELECT value FROM settings WHERE key='legacy_import_v1'")
      .first<{ value: string }>();
  const checkpoint = previous
    ? JSON.parse(previous.value)
    : { done: false, cursor: undefined, imported: 0, warnings: 0 };
  if (checkpoint.done) return checkpoint;
  const list = await env.STATE.list({
    prefix: 'op:',
    limit: 20,
    ...(checkpoint.cursor ? { cursor: checkpoint.cursor } : {}),
  });
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  let count = 0,
    warnings = 0;
  for (const key of list.keys) {
    try {
      const legacy = await env.STATE.get<{
        id: string;
        hash: string;
        chatId: number;
        userId: number;
        ticket: Ticket;
        status: Operation['status'];
        row?: number;
      }>(key.name, 'json');
      if (
        !legacy ||
        legacy.id !== key.name.slice(3) ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(legacy.id) ||
        !Number.isSafeInteger(legacy.chatId) ||
        legacy.chatId <= 0 ||
        !Number.isSafeInteger(legacy.userId) ||
        !/^[a-f0-9]{64}$/.test(legacy.hash) ||
        !['OK', 'Revisar', 'Eliminado'].includes(legacy.status)
      )
        throw new Error('Invalid legacy operation');
      validateTicket(legacy.ticket);
      statements.push(
        db
          .prepare(
            "INSERT INTO tickets(id,hash,chat_id,user_id,data,status,image_key,mime,fingerprint,origin,created_at,updated_at,legacy_order) SELECT ?,?,?,?,?,?,NULL,NULL,NULL,'legacy',?,?,? WHERE NOT EXISTS(SELECT 1 FROM purged_tickets WHERE id=?) ON CONFLICT DO NOTHING",
          )
          .bind(
            legacy.id,
            legacy.hash,
            String(legacy.chatId),
            String(legacy.userId),
            JSON.stringify(legacy.ticket),
            legacy.status,
            now,
            now,
            legacy.row ?? 0,
            legacy.id,
          ),
      );
      count++;
    } catch {
      warnings++;
      statements.push(
        db
          .prepare('INSERT OR IGNORE INTO migration_issues(source_id,reason) VALUES(?,?)')
          .bind(key.name, 'Registro anterior pendiente de revisión; original conservado en KV.'),
      );
    }
  }
  const next = {
    done: list.list_complete,
    cursor: list.list_complete ? undefined : list.cursor,
    imported: checkpoint.imported + count,
    warnings: checkpoint.warnings + warnings,
  };
  if (previous)
    statements.push(
      db
        .prepare("UPDATE settings SET value=? WHERE key='legacy_import_v1' AND value=?")
        .bind(JSON.stringify(next), previous.value),
    );
  else
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('legacy_import_v1',?)")
        .bind(JSON.stringify(next)),
    );
  await db.batch(statements);
  return next;
}
const migrationReady = new WeakMap<D1Database, Promise<void>>();
async function ready(env: Env): Promise<void> {
  const db = database(env);
  let pending = migrationReady.get(db);
  if (!pending) {
    pending = importLegacyBatch(env)
      .then((result) => {
        if (!result.done)
          throw new StorageError(
            'HISTORY_IMPORT_PENDING',
            'Estamos recuperando el historial anterior. Pulsa Reintentar para continuar.',
            503,
          );
      })
      .catch((error) => {
        migrationReady.delete(db);
        throw error;
      });
    migrationReady.set(db, pending);
  }
  await pending;
}

export async function getOperation(env: Env, id: string): Promise<Operation | null> {
  await ready(env);
  const row = await database(env).prepare('SELECT * FROM tickets WHERE id=?').bind(id).first<Row>();
  return row ? operation(row) : null;
}
export async function findDuplicate(
  env: Env,
  chatId: number,
  hash: string,
  ticket?: Ticket,
): Promise<Operation | null> {
  await ready(env);
  const fingerprint = ticket ? await semanticKey(ticket) : null;
  const row = await database(env)
    .prepare(
      "SELECT * FROM tickets WHERE chat_id=? AND status!='Eliminado' AND (hash=? OR (? IS NOT NULL AND fingerprint=?)) LIMIT 1",
    )
    .bind(String(chatId), hash, fingerprint, fingerprint)
    .first<Row>();
  if (row) return operation(row);
  if (fingerprint) {
    const legacy = await database(env)
      .prepare(
        "SELECT * FROM tickets WHERE chat_id=? AND origin='legacy' AND fingerprint IS NULL AND status!='Eliminado'",
      )
      .bind(String(chatId))
      .all<Row>();
    for (const candidate of legacy.results) {
      const op = operation(candidate);
      if ((await semanticKey(op.ticket)) === fingerprint) return op;
    }
  }
  return null;
}
export async function dailyCount(env: Env, chatId: number): Promise<number> {
  return (
    (
      await database(env)
        .prepare('SELECT count FROM daily_usage WHERE chat_id=? AND day=?')
        .bind(String(chatId), new Date().toISOString().slice(0, 10))
        .first<{ count: number }>()
    )?.count ?? 0
  );
}
export async function updateCompleted(env: Env, id: number): Promise<boolean> {
  return !!(await database(env)
    .prepare('SELECT update_id FROM processed_updates WHERE update_id=?')
    .bind(id)
    .first());
}
export async function storeImage(env: Env, op: Operation, bytes: ArrayBuffer): Promise<void> {
  if (bytes.byteLength > 5_000_000)
    throw new StorageError('IMAGE_TOO_LARGE', 'La imagen supera el límite de 5 MB.', 413);
  const mime = imageMime(bytes);
  const key = `tickets/${op.chatId}/${op.id}.${mime === 'image/png' ? 'png' : 'jpg'}`;
  await bucket(env).put(key, bytes, {
    httpMetadata: { contentType: mime },
    customMetadata: { operation: op.id },
  });
  op.imageKey = key;
  op.mime = mime;
}
export async function saveNewTicket(
  env: Env,
  op: Operation,
  updateId: number,
): Promise<{ op: Operation; created: boolean }> {
  if (!op.imageKey || !op.mime)
    throw new StorageError('IMAGE_SAVE_REQUIRED', 'Primero debe guardarse la imagen del ticket.');
  await ready(env);
  const db = database(env);
  const fingerprint = await semanticKey(op.ticket);
  try {
    await db.batch([
      db
        .prepare(
          'INSERT INTO tickets(id,hash,chat_id,user_id,data,status,image_key,mime,fingerprint,origin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          op.id,
          op.hash,
          String(op.chatId),
          String(op.userId),
          JSON.stringify(op.ticket),
          op.status,
          op.imageKey,
          op.mime,
          fingerprint,
          'native',
          op.createdAt,
          new Date().toISOString(),
        ),
      db
        .prepare('INSERT INTO processed_updates(update_id,ticket_id) VALUES(?,?)')
        .bind(updateId, op.id),
      db
        .prepare("INSERT INTO audit(actor,action,target) VALUES(?,'ticket_create',?)")
        .bind(`Telegram ${op.chatId}`, op.id),
    ]);
    return { op, created: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('DAILY_TICKET_LIMIT'))
      throw new StorageError('DAILY_LIMIT', 'Alcanzaste el límite diario de 30 tickets.', 429);
    const receipt = await db
      .prepare(
        'SELECT t.* FROM tickets t JOIN processed_updates p ON t.id=p.ticket_id WHERE p.update_id=?',
      )
      .bind(updateId)
      .first<Row>();
    const existing = receipt
      ? operation(receipt)
      : await findDuplicate(env, op.chatId, op.hash, op.ticket);
    if (existing) {
      if (op.imageKey && op.imageKey !== existing.imageKey) await bucket(env).delete(op.imageKey);
      return { op: existing, created: false };
    }
    throw new StorageError(
      'TICKET_SAVE_PENDING',
      'La imagen quedó guardada temporalmente, pero no pude confirmar el registro. Reenvía la misma foto para recuperarlo.',
    );
  }
}
export async function updateTicket(
  env: Env,
  op: Operation,
  actor?: string,
  action = 'ticket_edit',
): Promise<void> {
  validateTicket(op.ticket);
  try {
    const statement = database(env)
      .prepare(
        'UPDATE tickets SET data=?,status=?,fingerprint=?,updated_at=? WHERE id=? AND chat_id=?',
      )
      .bind(
        JSON.stringify(op.ticket),
        op.status,
        await semanticKey(op.ticket),
        new Date().toISOString(),
        op.id,
        String(op.chatId),
      );
    const result = actor
      ? (
          await database(env).batch([
            statement,
            database(env)
              .prepare('INSERT INTO audit(actor,action,target) VALUES(?,?,?)')
              .bind(actor, action, op.id),
          ])
        )[0]
      : await statement.run();
    if (!result.meta.changes)
      throw new StorageError('TICKET_NOT_FOUND', 'Ticket no encontrado.', 404);
  } catch (error) {
    if (error instanceof StorageError) throw error;
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed'))
      throw new StorageError(
        'TICKET_DUPLICATE',
        'Esta corrección coincide con otro ticket registrado.',
        409,
      );
    throw error;
  }
}
export async function readTickets(env: Env, chatId?: number): Promise<TicketRecord[]> {
  await ready(env);
  const result = await database(env)
    .prepare(
      'SELECT * FROM tickets' +
        (chatId !== undefined ? " WHERE chat_id=? AND status!='Eliminado'" : '') +
        ' ORDER BY created_at DESC,legacy_order DESC,id DESC',
    )
    .bind(...(chatId !== undefined ? [String(chatId)] : []))
    .all<Row>();
  return result.results.map(ticketRecord);
}
function ticketRecord(row: Row): TicketRecord {
  const t = JSON.parse(row.data) as Ticket;
  return {
    fecha: t.fecha,
    comercio: t.comercio,
    folio: t.folio ?? '',
    moneda: t.moneda,
    total: t.total ?? 0,
    categoria: t.categoria,
    estado: row.status,
    userId: Number(row.user_id),
    operationId: row.id,
    createdAt: row.created_at,
    imageAvailable: !!row.image_key,
    origin: row.origin,
  };
}

export async function readImage(env: Env, op: Operation): Promise<R2ObjectBody | null> {
  return op.imageKey ? bucket(env).get(op.imageKey) : null;
}
export async function purgeTicket(env: Env, op: Operation, actor: string): Promise<void> {
  if (op.status !== 'Eliminado')
    throw new StorageError(
      'TICKET_NOT_DELETED',
      'Primero elimina el ticket de las consultas.',
      409,
    );
  if (op.imageKey) await bucket(env).delete(op.imageKey);
  await env.STATE.delete(`op:${op.id}`);
  await database(env).batch([
    database(env)
      .prepare('INSERT OR IGNORE INTO purged_tickets(id,purged_at) VALUES(?,?)')
      .bind(op.id, new Date().toISOString()),
    database(env).prepare('DELETE FROM processed_updates WHERE ticket_id=?').bind(op.id),
    database(env).prepare("DELETE FROM tickets WHERE id=? AND status='Eliminado'").bind(op.id),
    database(env)
      .prepare("INSERT INTO audit(actor,action,target) VALUES(?,'ticket_purge',?)")
      .bind(actor, op.id),
  ]);
}
export async function restoreImage(env: Env, op: Operation, bytes: ArrayBuffer): Promise<void> {
  if ((await sha256(bytes)) !== op.hash)
    throw new StorageError(
      'IMPORT_IMAGE_NOT_MATCHED',
      'La imagen no coincide con el registro.',
      409,
    );
  await storeImage(env, op, bytes);
  await database(env)
    .prepare('UPDATE tickets SET image_key=?,mime=?,updated_at=? WHERE id=? AND image_key IS NULL')
    .bind(op.imageKey, op.mime, new Date().toISOString(), op.id)
    .run();
}
export async function importImage(env: Env, bytes: ArrayBuffer): Promise<number> {
  await ready(env);
  const hash = await sha256(bytes);
  imageMime(bytes);
  const matched = (
    await database(env).prepare('SELECT * FROM tickets WHERE hash=?').bind(hash).all<Row>()
  ).results;
  if (!matched.length)
    throw new StorageError(
      'IMPORT_IMAGE_NOT_MATCHED',
      'La imagen no coincide con un registro pendiente. Usa el archivo original sin modificar.',
      409,
    );
  const rows = matched.filter((row) => !row.image_key);
  for (const row of rows) {
    const op = operation(row);
    await storeImage(env, op, bytes);
    await database(env)
      .prepare(
        'UPDATE tickets SET image_key=?,mime=?,updated_at=? WHERE id=? AND image_key IS NULL',
      )
      .bind(op.imageKey, op.mime, new Date().toISOString(), op.id)
      .run();
  }
  return rows.length;
}
export interface TicketQuery {
  chatId?: number;
  userId?: number;
  q?: string;
  mode?: 'panel' | 'bot';
  month?: string;
  activeOnly?: boolean;
}
const ticketOrder = 'created_at DESC,legacy_order DESC,id DESC';
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
function normalizedSql(expression: string): string {
  let sql = expression;
  for (const [letters, plain] of [
    ['áÁ', 'a'],
    ['éÉ', 'e'],
    ['íÍ', 'i'],
    ['óÓ', 'o'],
    ['úÚüÜ', 'u'],
    ['ñÑ', 'n'],
  ])
    for (const letter of letters) sql = `replace(${sql},'${letter}','${plain}')`;
  return `lower(${sql})`;
}
function ticketWhere(options: TicketQuery) {
  const clauses: string[] = [],
    values: (string | number)[] = [];
  if (options.chatId !== undefined) {
    clauses.push('chat_id=?');
    values.push(String(options.chatId));
  }
  if (options.userId !== undefined) {
    clauses.push('user_id=?');
    values.push(String(options.userId));
  }
  if (options.activeOnly || options.chatId !== undefined) clauses.push("status!='Eliminado'");
  const q = normalize((options.q ?? '').trim());
  const month =
    options.month || (options.mode === 'bot' && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) ? q : '');
  if (month) {
    const [year, number] = month.split('-').map(Number);
    const next =
      number === 12 ? `${year + 1}-01-01` : `${year}-${String(number + 1).padStart(2, '0')}-01`;
    clauses.push("json_extract(data,'$.fecha')>=? AND json_extract(data,'$.fecha')<?");
    values.push(month + '-01', next);
  }
  if (q && !(options.mode === 'bot' && month === q)) {
    const fields =
      options.mode === 'bot'
        ? ['comercio', 'folio', 'categoria']
        : ['comercio', 'fecha', 'categoria'];
    const searches = fields.map(
      (field) => `instr(${normalizedSql(`coalesce(json_extract(data,'$.${field}'),'')`)},?)>0`,
    );
    fields.forEach(() => values.push(q));
    if (options.mode !== 'bot') {
      searches.push('instr(user_id,?)>0');
      values.push(q);
    }
    clauses.push('(' + searches.join(' OR ') + ')');
  }
  return { sql: clauses.length ? ' WHERE ' + clauses.join(' AND ') : '', values };
}
export async function ticketPage(env: Env, options: TicketQuery, page = 1, pageSize = 25) {
  await ready(env);
  const where = ticketWhere(options),
    db = database(env);
  const [count, rows] = await db.batch([
    db.prepare('SELECT count(*) AS total FROM tickets' + where.sql).bind(...where.values),
    db
      .prepare(
        'SELECT * FROM tickets' + where.sql + ' ORDER BY ' + ticketOrder + ' LIMIT ? OFFSET ?',
      )
      .bind(...where.values, pageSize, (page - 1) * pageSize),
  ]);
  return {
    items: (rows.results as unknown as Row[]).map(ticketRecord),
    total: Number((count.results[0] as { total: number }).total),
    page,
    pageSize,
  };
}
export async function recentTickets(env: Env, chatId: number): Promise<TicketRecord[]> {
  await ready(env);
  const where = ticketWhere({ chatId, userId: chatId });
  const rows = await database(env)
    .prepare('SELECT * FROM tickets' + where.sql + ' ORDER BY ' + ticketOrder + ' LIMIT 5')
    .bind(...where.values)
    .all<Row>();
  return rows.results.map(ticketRecord);
}
export async function ticketStats(env: Env, options: TicketQuery, includeRequests = false) {
  await ready(env);
  const where = ticketWhere({ ...options, activeOnly: true }),
    db = database(env);
  const statements = [
    db
      .prepare(
        "SELECT json_extract(data,'$.moneda') AS currency,count(*) AS count,sum(coalesce(json_extract(data,'$.total'),0)) AS total FROM tickets" +
          where.sql +
          " GROUP BY json_extract(data,'$.moneda')",
      )
      .bind(...where.values),
  ];
  if (includeRequests)
    statements.push(
      db.prepare("SELECT count(*) AS count FROM access_requests WHERE status='pending'"),
    );
  const results = await db.batch(statements);
  const totals = results[0].results as unknown as {
    currency: string;
    count: number;
    total: number;
  }[];
  return {
    count: totals.reduce((sum, row) => sum + row.count, 0),
    totals: totals.map(({ currency, total }) => ({ currency, total })),
    pendingRequests: includeRequests
      ? Number((results[1].results[0] as { count: number }).count)
      : null,
  };
}
export async function ticketCsv(
  env: Env,
  options: TicketQuery,
): Promise<ReadableStream<Uint8Array>> {
  await ready(env);
  const where = ticketWhere(options),
    encoder = new TextEncoder();
  const cell = (value: unknown) =>
    '"' +
    String(value ?? '')
      .replace(/^[=+@\s-]/, (x) => "'" + x)
      .replaceAll('"', '""') +
    '"';
  const line = (values: unknown[]) => encoder.encode(values.map(cell).join(',') + '\r\n');
  async function* chunks() {
    yield encoder.encode('\ufeff');
    yield line(['Fecha', 'Comercio', 'Total', 'Moneda', 'Categoría', 'Usuario', 'Estado', 'ID']);
    let cursor: Row | undefined;
    while (true) {
      const seek = cursor
        ? (where.sql ? ' AND ' : ' WHERE ') + '(created_at,legacy_order,id)<(?,?,?)'
        : '';
      const rows = await database(env)
        .prepare(
          'SELECT * FROM tickets' + where.sql + seek + ' ORDER BY ' + ticketOrder + ' LIMIT 200',
        )
        .bind(
          ...where.values,
          ...(cursor ? [cursor.created_at, cursor.legacy_order, cursor.id] : []),
        )
        .all<Row>();
      if (!rows.results.length) return;
      for (const row of rows.results) {
        const t = ticketRecord(row);
        yield line([
          t.fecha,
          t.comercio,
          t.total,
          t.moneda,
          t.categoria,
          t.userId,
          t.estado,
          t.operationId,
        ]);
      }
      cursor = rows.results.at(-1);
      if (rows.results.length < 200) return;
    }
  }
  const iterator = chunks();
  return new ReadableStream({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });
}
