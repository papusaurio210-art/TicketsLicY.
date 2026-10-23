# Autorizar Google Drive y Sheets

Esta preparación requiere acciones del dueño de la cuenta Gmail en Google Cloud. El script `npm run bootstrap:google` crea después la carpeta y la hoja desde este repositorio. No compartas códigos ni tokens en el chat o en Git.

1. En Google Cloud Console crea un proyecto para el bot y habilita **Google Drive API** y **Google Sheets API**.
2. Configura la pantalla de consentimiento OAuth para usuarios **Externos**. Añade los permisos `https://www.googleapis.com/auth/drive.file` y `https://www.googleapis.com/auth/spreadsheets`. Si aparece una lista de usuarios de prueba, agrega la cuenta Gmail que guardará los tickets.
3. Crea un cliente OAuth de tipo **Aplicación web** y registra `https://developers.google.com/oauthplayground` como URI de redirección autorizada.
4. En [OAuth 2.0 Playground](https://developers.google.com/oauthplayground), abre la configuración (engranaje), activa **Use your own OAuth credentials** e introduce allí el ID y secreto del cliente recién creado. Asegúrate de solicitar acceso **offline**. Selecciona los dos permisos anteriores, autoriza con la cuenta Gmail propietaria y cambia el código por tokens. Guarda el **refresh token** en un gestor seguro; no lo pegues en el repositorio ni en el chat.
5. En la configuración de este entorno en la nube, revisa el borrador guardado: escribe el ID del cliente en `GOOGLE_CLIENT_ID` y los valores sensibles en `GOOGLE_CLIENT_SECRET` y `GOOGLE_REFRESH_TOKEN`. Revisa, guarda y publica el entorno para aplicar también el acceso de red a Google. La publicación es necesaria antes de que este entorno pueda usar los valores.
6. Avísame cuando la configuración esté publicada. Comprobaré la autorización y ejecutaré `npm run bootstrap:google`. El script reutiliza recursos existentes y devolverá los IDs de carpeta, Papelera y hoja que necesita el Worker.

Antes de producción, pon la pantalla de consentimiento en estado **En producción**. En modo Testing, los refresh tokens de aplicaciones externas pueden caducar a los siete días. Google puede mostrar una advertencia de aplicación no verificada para este uso personal.
