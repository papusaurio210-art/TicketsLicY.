import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { fixture, png, sampleOperation } from './support';
import {
  dailyCount,
  findDuplicate,
  getOperation,
  importImage,
  importLegacyBatch,
  purgeTicket,
  readTickets,
  saveNewTicket,
  storeImage,
  updateTicket,
} from '../src/storage';
import { sha256 } from '../src/http';
let current: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => {
  current = await fixture();
});
afterEach(async () => {
  await current.mf.dispose();
});
describe('almacenamiento privado Cloudflare', () => {
  it('recupera el historial sin conexión externa y vincula las imágenes originales por hash', async () => {
    const { env } = current,
      op = sampleOperation();
    op.ticket.folio = 'LEGACY-FOLIO';
    op.hash = await sha256(png);
    await env.STATE.put(
      'op:' + op.id,
      JSON.stringify({ ...op, fileId: 'old-provider-file', row: 2 }),
    );
    const migrated = await importLegacyBatch(env);
    expect(migrated.done).toBe(true);
    expect(migrated.imported).toBe(1);
    const rows = await readTickets(env);
    expect(rows).toHaveLength(1);
    expect(rows[0].origin).toBe('legacy');
    expect(rows[0].imageAvailable).toBe(false);
    expect((await findDuplicate(env,123,'b'.repeat(64),op.ticket))!.id).toBe(op.id);
    expect(await importImage(env, png)).toBe(1);
    const stored = await getOperation(env, op.id);
    expect(stored!.imageKey).toBeTruthy();
    expect(await env.TICKET_IMAGES!.head(stored!.imageKey!)).not.toBeNull();
    expect(await importImage(env, png)).toBe(0);
    await importLegacyBatch(env);
    expect(await readTickets(env)).toHaveLength(1);
    expect(await env.STATE.get('op:' + op.id)).not.toBeNull();
  });
  it('preserva los originales inválidos para revisión y no los inventa', async () => {
    const { env } = current;
    await env.STATE.put('op:invalid', '{"id":"invalid"}');
    const result = await importLegacyBatch(env);
    expect(result.warnings).toBe(1);
    expect(await env.STATE.get('op:invalid')).not.toBeNull();
    expect(await readTickets(env)).toHaveLength(0);
    expect(
      (await env.ADMIN_DB!.prepare('SELECT * FROM migration_issues').all()).results,
    ).toHaveLength(1);
  });
  it('limita a treinta tickets con operaciones concurrentes en la base', async () => {
    const { env } = current;
    await readTickets(env);
    const results = await Promise.allSettled(
      Array.from({ length: 32 }, async (_, i) => {
        const op = sampleOperation();
        op.imageKey = 'quota/' + op.id;
        op.mime = 'image/png';
        return saveNewTicket(env, op, 5000 + i);
      }),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(30);
    expect(await dailyCount(env, 123)).toBe(30);
    expect(await readTickets(env)).toHaveLength(30);
    expect(
      (await env.ADMIN_DB!.prepare('SELECT * FROM processed_updates').all()).results,
    ).toHaveLength(30);
  });
  it('evita duplicados entre peticiones sin bloquear a otro usuario con la misma imagen', async () => {
    const { env } = current;
    const first = sampleOperation();
    first.hash = await sha256(png);
    await storeImage(env, first, png);
    await saveNewTicket(env, first, 6000);
    const duplicate = { ...first, id: 'another-id', imageKey: null };
    await storeImage(env, duplicate, png);
    const saved = await saveNewTicket(env, duplicate, 6001);
    expect(saved.created).toBe(false);
    expect(saved.op.id).toBe(first.id);
    expect(await dailyCount(env, 123)).toBe(1);
    expect(await env.TICKET_IMAGES!.head(duplicate.imageKey!)).toBeNull();
    expect(await env.TICKET_IMAGES!.head(first.imageKey!)).not.toBeNull();
    const other = { ...first, id: 'other-user', chatId: 456, userId: 456, imageKey: null };
    await storeImage(env, other, png);
    expect((await saveNewTicket(env, other, 6002)).created).toBe(true);
    expect((await findDuplicate(env, 456, first.hash))!.id).toBe(other.id);
  });
  it('rechaza una corrección que crearía otro ticket idéntico', async () => {
    const { env } = current,
      first = sampleOperation(),
      second = sampleOperation();
    first.ticket.folio = 'ABC';
    second.ticket.folio = 'ABC';
    second.ticket.total = 117;
    await storeImage(env, first, png);
    await storeImage(env, second, png);
    await saveNewTicket(env, first, 7000);
    await saveNewTicket(env, second, 7001);
    second.ticket.total = 116;
    await expect(updateTicket(env, second)).rejects.toMatchObject({ code: 'TICKET_DUPLICATE' });
    expect((await getOperation(env, second.id))!.ticket.total).toBe(117);
  });
  it('borra definitivamente solo tras la eliminación y evita que una copia antigua reaparezca', async () => {
    const { env } = current,
      op = sampleOperation();
    op.hash = await sha256(png);
    await storeImage(env, op, png);
    await saveNewTicket(env, op, 8000);
    await expect(purgeTicket(env, op, 'owner')).rejects.toMatchObject({
      code: 'TICKET_NOT_DELETED',
    });
    op.status = 'Eliminado';
    await updateTicket(env, op);
    await purgeTicket(env, op, 'owner');
    expect(await getOperation(env, op.id)).toBeNull();
    expect(await env.TICKET_IMAGES!.head(op.imageKey!)).toBeNull();
    await env.STATE.put('op:' + op.id, JSON.stringify(op));
    await env.ADMIN_DB!.prepare("DELETE FROM settings WHERE key='legacy_import_v1'").run();
    await importLegacyBatch(env);
    expect(await getOperation(env, op.id)).toBeNull();
  });
});
