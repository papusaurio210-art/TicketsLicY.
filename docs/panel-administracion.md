# Panel de administración

Entra en `/admin` con tu usuario y contraseña. El panel concentra cuentas, permisos, tickets e imágenes. D1 guarda los datos y R2 las fotos privadas; no se necesita un correo para iniciar sesión.

## Instalar

Ejecuta `npm run bootstrap:admin` para preparar las cuentas y el código inicial de instalación. Después ejecuta `npm run bootstrap:storage` para preparar las tablas de tickets y R2. El acceso a Cloudflare se configura en el entorno, nunca por chat ni en Git. Los permisos necesarios son Workers Scripts Edit, D1 Edit, Workers R2 Storage Edit y Account Settings Read.

Publica el código y `wrangler.toml`. Abre el panel, introduce el código de `.admin-setup.txt` y crea la cuenta principal. Descarga los códigos de recuperación: cada uno sirve una sola vez. Después puedes retirar el código inicial y el secreto `ADMIN_SETUP_TOKEN`.

La instalación importa los IDs iniciales de `ALLOWED_CHAT_IDS`; el primero corresponde al propietario. Una vez creada la cuenta principal, los permisos del bot se leen de D1. La lista antigua no puede saltarse una revocación.

## Uso diario

- **Usuarios:** crea cuentas y asigna el rol Administrador o Usuario. Puedes vincular un ID de Telegram al crearlas. Suspender bloquea el panel y el bot y cierra las sesiones. La cuenta principal está protegida.
- **Solicitudes:** la persona pulsa Solicitar acceso en Telegram; aquí apruebas o rechazas. Aprobar habilita el bot, pero no crea automáticamente una cuenta del panel. La persona puede volver a pulsar Iniciar tras la aprobación.
- **Acceso al bot:** concede, revoca o restaura el acceso a Telegram. Para bloquear también el panel, suspende la cuenta en Usuarios.
- **Tickets:** consulta, filtra, abre imágenes, corrige registros o elimínalos de las consultas normales. Solo el administrador puede usar Borrar definitivamente sobre registros eliminados; esa acción suprime el registro y la imagen del almacenamiento activo.
- **Imágenes del historial anterior:** selecciona los archivos originales exportados para vincularlos a sus tickets. Consulta la [guía de importación](importar-historial.md).
- **Actividad:** muestra los últimos 100 cambios administrativos. El borrado definitivo conserva una referencia mínima de la acción, sin los datos del ticket.
- **Mi cuenta:** cambia tu contraseña y vuelve a iniciar sesión.

Los usuarios normales solo ven sus tickets. Las rutas de imágenes verifican la sesión y la propiedad del registro. No se habilitan enlaces públicos del bucket.

## Protección y operación

Las contraseñas usan PBKDF2-SHA256 con sal aleatoria y 100.000 iteraciones. Las sesiones duran ocho horas, sus tokens se almacenan como hashes y la cookie es Secure, HttpOnly y SameSite=Strict. Los cambios requieren el mismo origen. Los intentos de acceso y recuperación están limitados. Los códigos de recuperación también se guardan como hashes.

D1 comprueba los duplicados y el límite diario de tickets dentro de operaciones transaccionales. R2 y D1 no comparten una transacción: si un guardado se interrumpe, el bot conserva estado temporal para recuperar el registro al reenviar la foto. Una operación que ya está procesándose puede terminar después de revocar un acceso.

Eliminar conserva el registro y la imagen para revisión del administrador. Borrar definitivamente elimina el registro activo, su imagen y la copia individual del historial de KV, y evita su reimportación automática. No borra exportaciones o copias que estén en sistemas anteriores.
