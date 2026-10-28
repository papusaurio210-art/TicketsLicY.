# Panel de administración

El panel vive en `/admin`, dentro del mismo Worker que recibe los tickets. Se entra con usuario y contraseña, sin correo. Los usuarios y permisos se guardan en D1; los tickets siguen teniendo su registro en Sheets y sus imágenes en Drive.

## Preparar el panel

1. Configura `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN` en el entorno de trabajo. El token necesita permisos de cuenta **D1: Edit**, **Workers Scripts: Edit** y **Account Settings: Read**, limitados a la cuenta del proyecto.
2. Ejecuta `npm run bootstrap:admin`. Crea o reutiliza `ticketslicy-admin`, prepara sus tablas, añade el enlace `ADMIN_DB` a `wrangler.toml` y configura un código de instalación en el Worker. El código queda en `.admin-setup.txt`, excluido de Git; no se imprime.
3. Publica el código y la configuración con el flujo habitual de GitHub. Abre `/admin`, introduce el código y elige tu usuario y contraseña (mínimo 12 caracteres).
4. Descarga los tres códigos de recuperación que muestra el panel. Cada uno sirve una sola vez y permite restablecer la contraseña sin correo. Después elimina el archivo local `.admin-setup.txt` y, si quieres, el secreto `ADMIN_SETUP_TOKEN`: ya no son necesarios tras la instalación.

La instalación inicial se permite una sola vez mediante una operación atómica en D1. La cuenta principal se vincula al primer ID de `ALLOWED_CHAT_IDS`; los demás IDs existentes también se importan. Desde ese momento, los accesos del bot se gestionan en el panel. Modificar la lista antigua no puede saltarse una revocación.

## Uso diario

- **Usuarios:** crea cuentas del panel, asigna el rol de administrador o usuario, vincula Telegram al crearlas y cambia contraseñas. Suspender una cuenta bloquea tanto el panel como su acceso al bot y cierra sus sesiones. La cuenta principal está protegida frente a suspensiones y cambios por otras cuentas.
- **Solicitudes:** quien no está autorizado pulsa **Solicitar acceso** en Telegram. La solicitud se revisa aquí con **Aprobar** o **Rechazar**. No se envían notificaciones al administrador por Telegram. Después de aprobar, la persona puede volver a pulsar Iniciar en el bot. La aprobación permite usar el bot; no crea automáticamente una cuenta del panel.
- **Acceso al bot:** autoriza, revoca o restaura el acceso a Telegram. Revocar aquí bloquea las siguientes interacciones del bot; una operación que ya está procesándose puede terminar. Para bloquear también el panel, suspende la cuenta en **Usuarios**.
- **Tickets:** consulta y filtra registros; corrige comercio, fecha, total y categoría o elimina un ticket. La eliminación conserva la fila como Eliminado y mueve la imagen a Papelera. Los usuarios normales solo ven y modifican sus propios registros; los administradores pueden gestionar todos.
- **Actividad:** muestra los últimos 100 cambios hechos desde el panel, con su responsable. No incluye las acciones históricas del bot ni registra contraseñas.
- **Mi cuenta:** cambia tu contraseña. Se cierran las sesiones para que vuelvas a entrar con la nueva.

Puedes crear una cuenta del panel para una persona cuyo ID ya tenga acceso al bot, vinculando ese ID al crearla. No se puede asignar el mismo ID a dos cuentas. El panel no concede permisos de Google Drive: el acceso directo a las imágenes se mantiene privado y separado de los permisos del bot.

## Protección y límites

Las contraseñas usan PBKDF2-SHA256 con sal aleatoria y 100.000 iteraciones. Las sesiones duran ocho horas y se guardan como hashes; la cookie es Secure, HttpOnly y SameSite=Strict. Los cambios requieren el mismo origen. Se limitan los intentos de autenticación y recuperación a 15 cada 15 minutos por IP y operación. Los códigos de recuperación se guardan como hashes.

Los cambios entre Google, KV y D1 no son una única transacción. Si hay un error al actualizar un ticket, revisa su estado antes de repetir la acción. La base D1 administra cuentas y permisos; Sheets sigue siendo la fuente de los tickets.

Para validar localmente: `npm run typecheck` y `npm test`. Las pruebas de administración usan una base D1 local real mediante Miniflare; no crean usuarios de producción ni llaman a Google.
