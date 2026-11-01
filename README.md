# TicketsLicY

Bot privado de Telegram para registrar tickets desde una foto. El panel centraliza los registros, las imágenes, las solicitudes y los permisos. El almacenamiento funciona en Cloudflare: **D1** para datos, **R2** para imágenes privadas y **KV** para estado temporal. OpenAI extrae la información de las fotos.

- [Guía rápida de uso (Word)](docs/Guia_rapida_TicketsLicY.docx)
- [Administración del panel](docs/panel-administracion.md)
- [Importación del historial](docs/importar-historial.md)
- [Especificación del proyecto (Word)](docs/Especificacion_TicketsLicY.docx)

## Usar el bot

`/start` muestra los botones Nuevo ticket, Mis tickets, Este mes, Buscar y Ayuda. La corrección permite elegir un campo y escribir su valor; incluye Cancelar. El botón Correcto confirma el ticket. Eliminar lo oculta de las consultas normales sin borrar su imagen. Los comandos anteriores siguen disponibles.

Cada usuario ve sus propios tickets. Los grupos se ignoran. La detección de duplicados compara hash y, cuando existe folio, comercio, fecha, total y folio dentro del mismo usuario. D1 aplica los límites y la unicidad de forma transaccional; se permiten 30 tickets nuevos por chat y día UTC.

## Panel

Abre `/admin` para entrar con usuario y contraseña. Los administradores pueden gestionar cuentas, solicitudes, accesos, registros y sus imágenes. Un usuario normal solo ve sus registros. Las imágenes se entregan por una ruta que comprueba la sesión y los permisos; el bucket no tiene acceso público.

La cuenta principal se crea una sola vez con un código de instalación y entrega códigos de recuperación sin correo. Inicialmente se importan los IDs existentes de `ALLOWED_CHAT_IDS`; desde entonces el panel es la autoridad para conceder y revocar el acceso.

## Configuración

Recursos de `wrangler.toml`:

| Binding | Uso |
|---|---|
| `ADMIN_DB` | Base D1 de cuentas y tickets |
| `TICKET_IMAGES` | Bucket privado R2 |
| `STATE` | KV para conversaciones, recuperación temporal e importación antigua |

Secretos: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `OPENAI_API_KEY` y `ADMIN_SETUP_TOKEN` solo para la instalación inicial. `ALLOWED_CHAT_IDS` conserva los IDs iniciales para el primer administrador. No subas secretos al repositorio.

Variables públicas: `OPENAI_MODEL`, `PUBLIC_APP_URL` (sin barra final) y `PUBLIC_SUPPORT_EMAIL`. El modelo actual es `gpt-5-nano`; sus precios y precisión deben revisarse con uso real. El límite de gasto de la cuenta de OpenAI se configura en su panel.

## Preparar y desplegar

1. Ejecuta `npm ci` con Node.js 20 o superior.
2. Para una instalación nueva, configura el acceso de Cloudflare en el entorno y ejecuta `npm run bootstrap:admin`. El token necesita D1 Edit, Workers Scripts Edit y Account Settings Read.
3. Añade Workers R2 Storage Edit al token para preparar imágenes. Ejecuta `npm run bootstrap:storage`: crea o reutiliza `ticketslicy-images`, desactiva su acceso público y aplica `migrations/0002_tickets.sql` a la base configurada.
4. Ejecuta `npm run typecheck`, `npm test` y `npx wrangler deploy --dry-run`.
5. Sube el commit a `main`. Workers Builds usa `npm ci` y `npx wrangler deploy`. Conserva su token independiente y confirma que el build termine correctamente. Los cambios de esquema requieren aplicar la migración correspondiente antes de publicar el código que la usa.
6. En una instalación nueva, abre `/admin`, usa el código local `.admin-setup.txt` (ignorado por Git) y elige tus credenciales. Guarda los códigos de recuperación.
7. Registra `/telegram` mediante `npm run webhook:register`, con `WORKER_URL`, el token de Telegram y el secreto del webhook configurados en el entorno.

`/` y `/privacy` son páginas públicas informativas. `/health` comprueba que el Worker responde, no hace llamadas a OpenAI ni valida toda la infraestructura.

## Desarrollo y pruebas

`npm run dev` usa los recursos locales de Wrangler. Aplica las migraciones a D1 local antes de probar el panel. Las pruebas automatizadas usan D1, R2 y KV locales con Miniflare, y dobles para Telegram y OpenAI. Cubren permisos, imágenes privadas, recuperación, límites, duplicados e importación. No crean tickets de producción.

La foto debe ser JPG/PNG de hasta 5 MB. Las fechas se mantienen como aparecen en el ticket; las sospechosas se marcan para revisión. La corrección de fecha no cambia la ubicación de la imagen.

## Datos anteriores

Al consultar tickets se recuperan automáticamente los registros `op:` de KV, en lotes pequeños e idempotentes. Los originales se conservan. Las imágenes que solo estaban en el proveedor anterior requieren sus archivos originales; el panel permite importarlas por hash. Un registro sin imagen se muestra como Pendiente de importar, no como un enlace externo roto. Consulta la guía de importación antes de limpiar el almacenamiento anterior.

## Límites de operación

La escritura de una imagen en R2 y el registro en D1 no forman una única transacción. El bot conserva temporalmente la operación para reintentar sin repetir la extracción cuando falla D1. Una interrupción justo antes de guardar ese estado puede requerir repetir el procesamiento. Una revocación bloquea las siguientes interacciones, pero una operación ya iniciada puede terminar. Las copias de seguridad y la política de retención deben definirse según el uso del responsable.
