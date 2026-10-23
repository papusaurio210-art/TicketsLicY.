const { TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, WORKER_URL } = process.env;
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET || !WORKER_URL) {
  console.error('Faltan TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET o WORKER_URL');
  process.exit(1);
}
const url = new URL(WORKER_URL);
if (url.protocol !== 'https:') throw new Error('WORKER_URL debe usar HTTPS');
const webhook = new URL('/telegram', url);
const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: webhook.toString(), secret_token: TELEGRAM_WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query'] }),
});
const result = await response.json();
if (!response.ok || !result.ok) throw new Error(`Telegram setWebhook HTTP ${response.status}: ${result.description ?? 'unknown'}`);
console.log(`Webhook registrado: ${webhook}`);
