# Importar el historial anterior

La versión actual guarda los registros en D1 y las imágenes privadas en R2. No necesita conectar una cuenta de Google ni renovar sus tokens.

## Registros

Al abrir los tickets, la aplicación recupera las operaciones que el bot había guardado en KV. Conserva el identificador, el propietario, los datos y el estado de cada ticket. Si hay muchos, usa Reintentar para continuar los lotes. Los registros originales de KV no se eliminan durante esta importación. Los datos que no se puedan validar quedan señalados para revisión.

Esta recuperación usa el estado del bot. Si alguien cambió datos directamente en la hoja anterior, esos cambios pueden diferir de la copia que tiene KV: hay que revisarlos antes de retirar la hoja. La importación no inventa una imagen ni una fecha de captura original que no esté disponible; la fecha técnica del registro importado corresponde al momento de importación.

## Imágenes

Las imágenes que antes estaban en Drive no están en KV. Para traerlas sin depender de la autorización OAuth de la aplicación:

1. Desde tu cuenta de Drive, descarga la carpeta de tickets. Puedes descargarla como ZIP y extraerla en tu computadora.
2. En el panel entra como administrador y abre Tickets.
3. En Imágenes del historial anterior, selecciona los JPG/PNG originales (hasta 100 por lote, máximo 5 MB cada uno).
4. Pulsa Importar imágenes. El sistema compara el hash del archivo con el registro y lo vincula automáticamente. No importa cómo se llame el archivo.
5. Comprueba que aparezca Ver imagen. Los archivos que no coincidan se indican al terminar el lote. Las imágenes ya importadas se omiten.

No edites, recortes ni vuelvas a comprimir los archivos exportados: cambiarían su hash. Si vuelves a enviar al bot exactamente el mismo archivo de un ticket anterior y reconoce el duplicado, también puede recuperar la imagen pendiente de ese registro.

## Conservación

No borres la carpeta o la hoja anteriores hasta comprobar que los datos e imágenes necesarios están en el panel. Esta actualización no elimina archivos de Google ni revoca permisos de tu cuenta. Las credenciales antiguas del Worker dejan de usarse y pueden retirarse después del despliegue. Cualquier limpieza de copias anteriores se realiza por separado.
