// Run with NODE_USE_ENV_PROXY=1. Values of credentials are never printed.
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID } = process.env;
if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID)
  throw new Error('Configura CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno.');
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
    throw new Error(
      `Cloudflare HTTP ${response.status}: ${(data.errors ?? []).map((x) => x.message).join('; ')}`,
    );
  return data.result;
}
const name = 'ticketslicy-admin';
const databases = await api('/d1/database?per_page=100');
let database = databases.find((x) => x.name === name);
if (!database) database = await api('/d1/database', { name });
const id = database.uuid;
console.log('Base D1:', name, id);
const sql = await readFile(new URL('../migrations/0001_admin.sql', import.meta.url), 'utf8');
for (const statement of sql.split(';').filter((x) => x.trim()))
  await api(`/d1/database/${id}/query`, { sql: statement });
console.log('Tablas preparadas.');
const configPath = new URL('../wrangler.toml', import.meta.url);
let config = await readFile(configPath, 'utf8');
if (!config.includes('binding = "ADMIN_DB"')) {
  config += `\n[[d1_databases]]\nbinding = "ADMIN_DB"\ndatabase_name = "${name}"\ndatabase_id = "${id}"\nmigrations_dir = "migrations"\n`;
  await writeFile(configPath, config);
} else if (!config.includes(`database_id = "${id}"`))
  throw new Error('La configuración ya usa otra base. Revisa ADMIN_DB antes de publicar.');
const state = await api(`/d1/database/${id}/query`, {
  sql: "SELECT value FROM settings WHERE key='initialized'",
});
if (state[0]?.results?.length) {
  console.log('La cuenta principal ya está creada. No se cambia el código de instalación.');
} else {
  const token = randomBytes(32).toString('hex');
  await api(
    '/workers/scripts/ticketslicy-bot/secrets',
    { name: 'ADMIN_SETUP_TOKEN', type: 'secret_text', text: token },
    'PUT',
  );
  const destination = new URL('../.admin-setup.txt', import.meta.url);
  await writeFile(
    destination,
    `Código de instalación del panel (no es una contraseña de usuario):\n${token}\n\nAbre https://ticketslicy-bot.willicer1313.workers.dev/admin después de desplegar y crea tu usuario y contraseña.\nGuarda los códigos de recuperación que mostrará el panel.\nDespués puedes eliminar este archivo y el secreto ADMIN_SETUP_TOKEN.\n`,
    { mode: 0o600 },
  );
  await chmod(destination, 0o600);
  console.log(
    'Código de instalación guardado en .admin-setup.txt (ignorado por Git). No lo compartas por chat.',
  );
}
console.log('Publica wrangler.toml junto con el código del panel para habilitar ADMIN_DB.');
