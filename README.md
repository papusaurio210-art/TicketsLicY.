# TicketsLicY — bot de tickets

Worker de Cloudflare que recibe fotos por Telegram, extrae datos con OpenAI y registra la imagen y sus datos en Google Drive y Sheets. La especificación original está en el documento DOCX de este repositorio.

El bot acepta únicamente chats privados cuyos IDs estén en `ALLOWED_CHAT_IDS`. Los grupos se ignoran.

## Consultas del bot

Cada chat autorizado ve solo los tickets que envió. Las consultas leen Google Sheets, que es la fuente de verdad; los tickets con estado `Eliminado` no aparecen ni suman.

- `/ultimos`: muestra los cinco registros más recientes.
- `/total_mes`: suma los tickets del mes actual por moneda, según la fecha del ticket.
- `/total_mes 2026-09`: suma otro mes.
- `/buscar mercado`: busca en comercio, folio o categoría y muestra hasta cinco resultados.
- `/buscar 2026-09`: muestra tickets de ese mes.

Las búsquedas son concretas; el bot aún no interpreta preguntas en lenguaje natural. `/start` muestra un teclado fijo con **Nuevo ticket**, **Mis tickets**, **Este mes**, **Buscar** y **Ayuda**. **Buscar** pide una palabra o un mes y permite cancelar con un botón. Los comandos anteriores siguen disponibles. Después de registrar el ticket, el botón **Corregir** muestra los datos editables: se elige uno y se envía el valor nuevo sin escribir `campo=valor`. El mensaje que pide el valor incluye un botón **Cancelar**. La fecha acepta `DD/MM/AAAA` o `AAAA-MM-DD`; al cambiarla, la imagen se mueve a la carpeta correspondiente en Drive. Una fecha del año anterior cercana al día actual se señala para revisar el año, sin modificarla automáticamente.

## Desarrollo local

Requiere Node.js 20 o superior. Ejecuta `npm ci`, `npm run typecheck`, `npm test` y `npm run dev`. `GET /health` responde `{"ok":true}`. `POST /telegram` requiere `X-Telegram-Bot-Api-Secret-Token`; el webhook responde rápido y procesa en segundo plano.

Para llamadas reales crea `.dev.vars` (está ignorado por Git) con estos nombres y tus valores: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `ALLOWED_CHAT_IDS`, `GOOGLE_FOLDER_ID`, `GOOGLE_SHEET_ID` y `GOOGLE_TRASH_FOLDER_ID`. Nunca subas secretos al repositorio. En producción configura esos mismos nombres como secretos del Worker; los IDs y chats también se guardan allí para evitar publicarlos en Git.

## Preparación de Google

Sigue la [guía de autorización](docs/google-setup.md) para crear el proyecto y obtener un refresh token sin compartirlo por chat.

Habilita Drive API y Sheets API en Google Cloud. Crea un cliente OAuth de aplicación de escritorio o web y autoriza la cuenta propietaria con los scopes `https://www.googleapis.com/auth/drive.file` y `https://www.googleapis.com/auth/spreadsheets`. Publica la pantalla de consentimiento en modo **En producción** para evitar que el refresh token de una app en pruebas caduque tras siete días. Con las tres variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN` en el entorno local, ejecuta `npm run bootstrap:google`. El script crea o reutiliza una carpeta `Tickets`, su subcarpeta `Papelera` y la hoja con sus encabezados; imprime los tres IDs para configurar el Worker. No imprime credenciales.

## Despliegue

1. El namespace KV `ticketslicy-state` ya está creado y vinculado como `STATE` en `wrangler.toml`.
2. Configura los diez nombres indicados arriba con `wrangler secret put` o en el panel de Cloudflare. `OPENAI_MODEL` es configurable; el valor inicial es `gpt-4.1-mini` y debe verificarse con tickets reales antes de producción.
3. Cloudflare Workers Builds está conectado a este repositorio y a la rama `main`; usa `npm ci` como comando de build y `npx wrangler deploy` como comando de deploy. Cada cambio requiere un commit y un `git push` a `main`; confirma que el build termine correctamente. Cloudflare usa un token propio de Workers Builds que debe permanecer activo para los despliegues automáticos.
4. Tras desplegar y verificar las variables, configura `WORKER_URL` con la URL HTTPS pública del Worker y ejecuta `npm run webhook:register` con `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET` en el entorno. El script registra `/telegram` y el secreto de webhook en Telegram.

La integración real con Telegram, OpenAI y Google requiere cuentas y credenciales; `npm test` usa dobles locales y no realiza llamadas externas. Mantén el límite de gasto de OpenAI y revisa las políticas de retención de los tickets.

## Estado de validación

La comprobación de tipos, las pruebas locales y `wrangler deploy --dry-run` validan el código y el paquete del Worker. El Worker está desplegado en `https://ticketslicy-bot.willicer1313.workers.dev` y Telegram tiene registrado su webhook; Google OAuth, Sheets y Drive respondieron correctamente con la cuenta configurada. El primer build automático desde GitHub se completó y el usuario probó el registro de una foto y la corrección de su fecha. Queda probar las consultas, la eliminación y más tickets reales. KV limita el gasto por chat y día, pero sus contadores y marcas de duplicado no son transacciones atómicas; antes de aumentar el volumen conviene pasar esas operaciones a Durable Objects o D1.
