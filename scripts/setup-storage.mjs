import { readFile, writeFile } from 'node:fs/promises';
const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN } = process.env;
if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN)
  throw Error('Configura el acceso a Cloudflare en el entorno.');
const base = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}`;
async function api(path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw Error(
      `Cloudflare HTTP ${response.status}: ${(data.errors ?? []).map((x) => x.message).join('; ')}`,
    );
  return data.result;
}
const name = 'ticketslicy-images';
const result = await api('/r2/buckets');
if (!result.buckets?.some((x) => x.name === name)) await api('/r2/buckets', { name });
await api(`/r2/buckets/${name}/domains/managed`, { enabled: false }, 'PUT');
const configPath = new URL('../wrangler.toml', import.meta.url);
let config = await readFile(configPath, 'utf8');
if (!config.includes('binding = "TICKET_IMAGES"')) {
  config += `\n[[r2_buckets]]\nbinding = "TICKET_IMAGES"\nbucket_name = "${name}"\n`;
  await writeFile(configPath, config);
} else if (!config.includes(`bucket_name = "${name}"`))
  throw Error('TICKET_IMAGES ya apunta a otro almacenamiento. Revisa su configuración.');
const binding = config
  .split('[[d1_databases]]')
  .find((part) => part.includes('binding = "ADMIN_DB"'));
const databaseId = binding?.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
if (!databaseId) throw Error('Falta configurar ADMIN_DB en wrangler.toml.');
for (const migration of ['0002_tickets.sql', '0003_query_indexes.sql']) {
  await api(`/d1/database/${databaseId}/query`, {
    sql: await readFile(new URL('../migrations/' + migration, import.meta.url), 'utf8'),
  });
}
console.log('Almacenamiento privado R2 preparado:', name);
console.log(
  'Publica el código junto con wrangler.toml para usar D1 y R2. El historial de KV se recupera automáticamente al abrir los tickets.',
);
