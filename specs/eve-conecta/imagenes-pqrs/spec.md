# Imágenes anexas en PQRS

## Objetivo

Permitir que la administración anexe evidencia visual al crear un caso de PQRS o incidencia.

## Reglas funcionales

- Cada caso admite entre 0 y 3 imágenes.
- Los formatos permitidos son JPG, PNG y WebP.
- Cada archivo puede pesar máximo 5 MB.
- La persona usuaria puede previsualizar y quitar imágenes antes de crear el caso.
- El caso conserva las rutas privadas de sus evidencias y muestra la cantidad de anexos.
- Si falla la creación, se eliminan los archivos que se hayan alcanzado a almacenar.

## Seguridad

- Las imágenes se guardan en un bucket privado.
- La ruta incluye copropiedad, usuario autenticado y un identificador único de carga.
- Solo administración y superadministración pueden cargar o eliminar imágenes bajo su propia ruta.
- Los miembros activos solo pueden consultar archivos pertenecientes a su copropiedad.
- La API verifica que cada ruta pertenezca a la sesión y que el objeto exista antes de crear el caso.
