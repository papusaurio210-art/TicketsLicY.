import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { fixture, sampleOperation } from './support';
import {
  importLegacyBatch,
  readTickets,
  ticketPage,
  ticketStats,
  ticketCsv,
  recentTickets,
} from '../src/storage';
import { visibleTickets, searchTickets, monthTotals } from '../src/queries';
let current: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => {
  current = await fixture();
  const db = current.env.ADMIN_DB!;
  await importLegacyBatch(current.env);
  await db.batch(
    Array.from({ length: 260 }, (_, i) => {
      const op = sampleOperation(i >= 230 && i < 255 ? 456 : 123);
      op.ticket.comercio =
        i === 0 ? 'Café Ñandú "Local",\nTienda' : i === 1 ? '=SUM(1,2)' : 'Mercado ' + i;
      op.ticket.folio = 'FOLIO-' + i;
      op.ticket.fecha = i % 3 === 0 ? '2026-10-21' : '2026-11-01';
      op.ticket.moneda = i % 13 === 0 ? 'USD' : 'MXN';
      op.ticket.total = i + 0.1;
      return db
        .prepare(
          "INSERT INTO tickets(id,hash,chat_id,user_id,data,status,origin,created_at,updated_at) VALUES(?,?,?,?,?,?,'legacy',?,?)",
        )
        .bind(
          'query-' + String(i).padStart(4, '0'),
          op.hash,
          String(op.chatId),
          String(op.userId),
          JSON.stringify(op.ticket),
          i >= 255 ? 'Eliminado' : 'OK',
          '2026-11-01T12:00:00Z',
          '2026-11-01T12:00:00Z',
        );
    }),
  );
  await db
    .prepare(
      "INSERT INTO access_requests(chat_id,display_name,status) VALUES('789','Pending','pending')",
    )
    .run();
});
afterAll(async () => current?.mf.dispose());
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if (c === '\n' && !quoted) {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  return rows;
}
describe('consultas acotadas y exportación completa', () => {
  it('pagina con orden estable incluso si todos los registros tienen la misma fecha de creación', async () => {
    const { env } = current,
      all = await readTickets(env);
    const pages = await Promise.all([ticketPage(env, {}, 1), ticketPage(env, {}, 2)]);
    expect(pages[0].total).toBe(260);
    expect(pages[0].items).toEqual(all.slice(0, 25));
    expect(pages[1].items).toEqual(all.slice(25, 50));
    expect((await ticketPage(env, { chatId: 123 })).total).toBe(230);
    expect(
      (await ticketPage(env, { chatId: 123 })).items.every(
        (t) => t.userId === 123 && t.estado !== 'Eliminado',
      ),
    ).toBe(true);
    expect((await ticketPage(env, { chatId: 999 })).items).toEqual([]);
  });
  it('busca por acentos, folio y mes sin tratar caracteres como comodines ni cruzar propietarios', async () => {
    const { env } = current,
      all = visibleTickets(await readTickets(env, 123), 123, undefined);
    for (const q of ['CAFE', 'nandu', 'folio-12', '2026-10']) {
      const found = await ticketPage(env, { chatId: 123, userId: 123, q, mode: 'bot' }, 1, 1000);
      expect(found.items).toEqual(searchTickets(all, q));
    }
    expect((await ticketPage(env, { q: '%' })).total).toBe(0);
    expect((await ticketPage(env, { chatId: 456, q: 'nandu' })).total).toBe(0);
    expect((await ticketPage(env, { q: '456' })).total).toBe(25);
    expect(await recentTickets(env, 123)).toEqual(all.slice(0, 5));
  });
  it('calcula totales por moneda y fecha del comprobante conservando los límites de acceso', async () => {
    const { env } = current,
      stats = await ticketStats(env, {}, true);
    expect(stats.count).toBe(255);
    expect(stats.pendingRequests).toBe(1);
    const mine = await ticketStats(env, { chatId: 123, userId: 123, month: '2026-10' });
    const reference = monthTotals(
      visibleTickets(await readTickets(env, 123), 123, undefined),
      '2026-10',
    );
    for (const row of mine.totals) expect(row.total).toBeCloseTo(reference.get(row.currency)!, 8);
    expect((await ticketStats(env, { chatId: 999 })).count).toBe(0);
  });
  it('exporta todos los resultados en varios lotes, conserva comillas y neutraliza fórmulas', async () => {
    const { env } = current;
    const rows = parseCsv(await new Response(await ticketCsv(env, {})).text());
    expect(rows).toHaveLength(261);
    expect(new Set(rows.slice(1).map((r) => r[7])).size).toBe(260);
    expect(rows.find((r) => r[7] === 'query-0000')![1]).toBe('Café Ñandú "Local",\nTienda');
    expect(rows.find((r) => r[7] === 'query-0001')![1]).toBe("'=SUM(1,2)");
    const filtered = parseCsv(
      await new Response(await ticketCsv(env, { chatId: 123, q: 'mercado' })).text(),
    );
    expect(filtered).toHaveLength(229);
    expect(filtered.slice(1).every((r) => r[5] === '123' && r[6] !== 'Eliminado')).toBe(true);
  });
  it('reduce los datos transferidos sin cambiar los resultados', async () => {
    const { env } = current;
    const start = performance.now(),
      full = await readTickets(env),
      fullMs = performance.now() - start;
    const next = performance.now(),
      page = await ticketPage(env, {}),
      pageMs = performance.now() - next;
    const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;
    const summary = await ticketStats(env, {});
    expect(bytes(page)).toBeLessThan(bytes(full) / 3);
    expect(bytes(summary)).toBeLessThan(1000);
    console.log(
      'Consulta local con 260 tickets',
      JSON.stringify({
        fullBytes: bytes(full),
        pageBytes: bytes(page),
        summaryBytes: bytes(summary),
        fullMs,
        pageMs,
      }),
    );
    const plan = await env
      .ADMIN_DB!.prepare(
        'EXPLAIN QUERY PLAN SELECT id FROM tickets ORDER BY created_at DESC,legacy_order DESC,id DESC LIMIT 25',
      )
      .all<{ detail: string }>();
    expect(plan.results.some((r) => r.detail.includes('tickets_all_order'))).toBe(true);
  });
});
