const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) {
  console.error(`Faltan variables: ${missing.join(', ')}`);
  process.exit(1);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${new URL(url).hostname} HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return response.json();
}

const token = await request('https://oauth2.googleapis.com/token', {
  method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }),
});
const auth = { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' };
const drive = (url, options = {}) => request(`https://www.googleapis.com/drive/v3/${url}`, { ...options, headers: auth });
const sheets = (url, options = {}) => request(`https://sheets.googleapis.com/v4/${url}`, { ...options, headers: auth });

async function folder(name, parent) {
  const q = encodeURIComponent(`name = '${name}' and '${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const found = await drive(`files?q=${q}&fields=files(id)&spaces=drive`);
  if (found.files.length) return found.files[0].id;
  const created = await drive('files?fields=id', {
    method: 'POST', body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] }),
  });
  return created.id;
}

const root = await folder('Tickets', 'root');
const trash = await folder('Papelera', root);
const q = encodeURIComponent(`name = 'Tickets - Registro' and '${root}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
let spreadsheet = (await drive(`files?q=${q}&fields=files(id)&spaces=drive`)).files[0];
if (!spreadsheet) {
  spreadsheet = await sheets('spreadsheets', {
    method: 'POST', body: JSON.stringify({ properties: { title: 'Tickets - Registro' }, sheets: [{ properties: { title: 'Tickets' } }] }),
  });
  const meta = await drive(`files/${spreadsheet.spreadsheetId}?fields=parents`);
  const remove = (meta.parents ?? []).join(',');
  await drive(`files/${spreadsheet.spreadsheetId}?addParents=${root}&removeParents=${remove}`, { method: 'PATCH', body: '{}' });
  spreadsheet.id = spreadsheet.spreadsheetId;
}
const headers = ['Fecha captura', 'Fecha ticket', 'Comercio', 'RFC', 'Folio', 'Moneda', 'Subtotal', 'IVA', 'Propina', 'Total', 'Método de pago', 'Categoría', 'Confianza', 'Estado', 'Link Drive', 'Quién lo envió', 'ID de operación', 'Hash'];
const existing = await sheets(`spreadsheets/${spreadsheet.id}/values/Tickets!A1:R1`);
if (!existing.values?.length) {
  await sheets(`spreadsheets/${spreadsheet.id}/values/Tickets!A1:R1?valueInputOption=RAW`, {
    method: 'PUT', body: JSON.stringify({ values: [headers] }),
  });
}
console.log(`GOOGLE_FOLDER_ID=${root}`);
console.log(`GOOGLE_TRASH_FOLDER_ID=${trash}`);
console.log(`GOOGLE_SHEET_ID=${spreadsheet.id}`);
