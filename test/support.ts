/// <reference types="node" />
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFileSync } from 'node:fs';
import type { Env, Operation } from '../src/types';
export async function fixture() {
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response("ok")}}',
      compatibilityDate: '2026-10-20',
      d1Databases: ['ADMIN_DB'],
      kvNamespaces: ['STATE'],
      r2Buckets: ['TICKET_IMAGES'],
    }),
  );
  const db = await mf.getD1Database('ADMIN_DB');
  for (const path of ['migrations/0001_admin.sql', 'migrations/0002_tickets.sql']) {
    const sql = readFileSync(path, 'utf8'),
      at = sql.indexOf('CREATE TRIGGER');
    for (const part of (at < 0 ? sql : sql.slice(0, at)).split(';').filter((x) => x.trim()))
      await db.prepare(part).run();
    if (at >= 0) await db.prepare(sql.slice(at)).run();
  }
  const env: Env = {
    ADMIN_DB: db as unknown as D1Database,
    STATE: (await mf.getKVNamespace('STATE')) as unknown as KVNamespace,
    TICKET_IMAGES: (await mf.getR2Bucket('TICKET_IMAGES')) as unknown as R2Bucket,
    ADMIN_SETUP_TOKEN: 'a'.repeat(64),
    ALLOWED_CHAT_IDS: '123',
    TELEGRAM_BOT_TOKEN: 'bot',
    TELEGRAM_WEBHOOK_SECRET: 'secret',
    OPENAI_API_KEY: 'test-key',
    OPENAI_MODEL: 'test-model',
    PUBLIC_APP_URL: 'https://tickets.example',
  };
  return { mf, env };
}
export function sampleOperation(chatId = 123): Operation {
  return {
    id: crypto.randomUUID().replaceAll('-', '').slice(0, 16),
    hash: crypto.randomUUID().replaceAll('-', '').repeat(2),
    chatId,
    userId: chatId,
    imageKey: null,
    mime: null,
    origin: 'native',
    createdAt: new Date().toISOString(),
    status: 'OK',
    ticket: {
      comercio: 'Mercado',
      fecha: new Date().toISOString().slice(0, 10),
      rfc_emisor: null,
      hora: null,
      folio: null,
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
}
export const png = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6SfsAAAAASUVORK5CYII=',
  ),
  (x) => x.charCodeAt(0),
).buffer;
