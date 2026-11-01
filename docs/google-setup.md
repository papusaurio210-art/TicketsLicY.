# Autorizar Google Drive y Sheets

Esta preparación requiere acciones del dueño de la cuenta Gmail en Google Cloud. El script `npm run bootstrap:google` crea después la carpeta y la hoja desde este repositorio. No compartas códigos ni tokens en el chat o en Git.

1. En Google Cloud Console crea un proyecto para el bot y habilita **Google Drive API** y **Google Sheets API**.
2. Configura la pantalla de consentimiento OAuth para usuarios **Externos**. Añade los permisos `https://www.googleapis.com/auth/drive.file` y `https://www.googleapis.com/auth/spreadsheets`. Si aparece una lista de usuarios de prueba, agrega la cuenta Gmail que guardará los tickets.
3. Crea un cliente OAuth de tipo **Aplicación web** y registra `https://developers.google.com/oauthplayground` como URI de redirección autorizada.
4. En [OAuth 2.0 Playground](https://developers.google.com/oauthplayground), abre la configuración (engranaje), activa **Use your own OAuth credentials** e introduce allí el ID y secreto del cliente recién creado. Asegúrate de solicitar acceso **offline**. Selecciona los dos permisos anteriores, autoriza con la cuenta Gmail propietaria y cambia el código por tokens. Guarda el **refresh token** en un gestor seguro; no lo pegues en el repositorio ni en el chat.
5. En la configuración de este entorno en la nube, revisa el borrador guardado: escribe el ID del cliente en `GOOGLE_CLIENT_ID` y los valores sensibles en `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN`. Revisa, guarda y publica el entorno para aplicar también el acceso de red a Google. La publicación es necesaria antes de que este entorno pueda usar los valores.
6. Avísame cuando la configuración esté publicada. Comprobaré la autorización y ejecutaré `npm run bootstrap:google`. El script reutiliza recursos existentes y devolverá los IDs de carpeta, Papelera y hoja que necesita el Worker.

Antes de producción, pon la pantalla de consentimiento en estado **En producción**. En modo Testing, los refresh tokens de aplicaciones externas pueden caducar a los siete días. Google puede mostrar una advertencia de aplicación no verificada para este uso personal.

## Página principal y privacidad para Google

La configuración de marca puede exigir páginas públicas antes de permitir publicar. El Worker sirve estas páginas sin inicio de sesión:

- Página principal: `https://ticketslicy-bot.willicer1313.workers.dev/`
- Política de privacidad: `https://ticketslicy-bot.willicer1313.workers.dev/privacy`

Configura el nombre **TicketsLicY**, el correo de asistencia y el contacto del desarrollador. Usa esos enlaces en los campos de marca correspondientes. El correo público de las páginas se configura con `PUBLIC_SUPPORT_EMAIL` en `wrangler.toml` y debe ser un correo que el responsable haya autorizado publicar.

Si Google exige además verificar un dominio autorizado, será necesario usar un dominio que controle el responsable y alojar allí estas mismas páginas, por ejemplo mediante un dominio personalizado del Worker. Los enlaces públicos no sustituyen esa verificación. No registres `workers.dev` como si fuera un dominio propio: pertenece al proveedor.

## Restablecer la conexión

Si el panel muestra que Google necesita una nueva autorización, el refresh token venció o fue revocado. La cuenta del panel es independiente y puedes seguir administrando usuarios y accesos.

1. Abre el proyecto existente en Google Cloud. En **Google Auth Platform → Audience** (o la pantalla de consentimiento OAuth), comprueba que el estado sea **En producción** antes de obtener el token nuevo. En **Testing**, los tokens con los permisos usados por el bot pueden vencer a los siete días.
2. Abre [OAuth 2.0 Playground](https://developers.google.com/oauthplayground). En el engranaje, activa **Use your own OAuth credentials** e introduce el **mismo cliente OAuth** del bot y su secreto vigente. Solicita acceso **offline**.
3. Autoriza los permisos `https://www.googleapis.com/auth/drive.file` y `https://www.googleapis.com/auth/spreadsheets` con la **misma cuenta de Google** que tiene los tickets. Intercambia el código por tokens y copia el **refresh token** nuevo, no el access token.
4. En Cloudflare abre **Workers & Pages → ticketslicy-bot → Settings → Variables and Secrets**. Edita `GOOGLE_REFRESH_TOKEN`, pulsa **Rotate**, introduce el valor nuevo y pulsa **Deploy**. Si también cambiaste el secreto del cliente OAuth, actualiza `GOOGLE_CLIENT_SECRET`. No publiques los valores en el chat ni en Git.
5. Recarga el panel y pulsa **Reintentar**. No hay que crear otra cuenta del panel, cambiar los IDs de Drive/Sheets ni volver a ejecutar la preparación de carpetas.

Si quieres que este entorno también pueda comprobar la conexión, actualiza su secreto `GOOGLE_REFRESH_TOKEN` por separado: el secreto del Worker y el del entorno son configuraciones distintas.

## Otros diagnósticos de conexión

El panel distingue los siguientes casos sin mostrar claves ni la respuesta privada de Google:

| Diagnóstico | Qué revisar |
|---|---|
| `GOOGLE_CLIENT_INVALID` | `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` deben corresponder al mismo cliente OAuth con el que se generó el refresh token. Revisa los valores en el Worker, no solo en el entorno de desarrollo. Si cambiaste de cliente, autoriza de nuevo con ese cliente y la misma cuenta. |
| `GOOGLE_CONFIG_MISSING` | Falta una de las tres credenciales en el Worker. |
| `GOOGLE_SCOPE_MISSING` | Vuelve a autorizar los permisos de Drive y Sheets y reemplaza el refresh token. |
| `GOOGLE_API_DISABLED` | Habilita Drive API y Sheets API en el proyecto del cliente OAuth. |
| `GOOGLE_PERMISSION_DENIED` | Comprueba que se autorizó la cuenta propietaria y que tiene acceso al archivo configurado. |
| `GOOGLE_SHEET_NOT_FOUND` | Revisa el ID de la hoja y la cuenta autorizada. |
| `GOOGLE_SHEET_INVALID` | Usa solo el ID de la hoja, no su URL completa, y comprueba que conserve una pestaña llamada Tickets. |
| `GOOGLE_SHEET_HEADERS_INVALID` | Las columnas de la hoja difieren del formato esperado; revísalas antes de modificarlas. |
| `GOOGLE_UNAVAILABLE` | Reintenta más tarde y revisa si Google respondió con un error temporal. |

El último diagnóstico guarda únicamente código, etapa, estado HTTP cuando existe y fecha en `settings.google_connection_status` de D1. No guarda claves, imágenes ni tickets. Una lectura correcta lo actualiza a `OK`.
