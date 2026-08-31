# Creación de casos PQRS por rol

## Propósito

Permitir que todos los roles del conjunto creen casos PQRS sin perder el aislamiento de
datos: el residente reporta lo de su unidad con identidad derivada del padrón, el consejo
registra hallazgos propios sin acceder al censo identificado y la administración conserva
la vista completa de la bandeja.

## Decisiones de producto

- Residente y consejo pueden crear casos PQRS (decisión del 30 de agosto de 2026).
- El consejo ve únicamente los casos que él mismo creó; la administración ve todos; el
  residente ve los de su unidad.
- Las evidencias de imagen (hasta 3, JPG/PNG/WebP, 5 MB) pueden anexarlas todos los roles,
  siempre bajo la carpeta privada de quien crea el caso.

## Criterios de aceptación (EARS)

1. **CUANDO** un residente autenticado cree un caso, **EL sistema DEBERÁ** derivar el
   solicitante y la unidad del padrón vigente y descartar cualquier valor enviado por el
   navegador.
2. **CUANDO** un miembro del consejo o de la administración cree un caso, **EL sistema
   DEBERÁ** exigir solicitante y unidad explícitos.
3. **CUANDO** un usuario sin membresía activa en la copropiedad intente crear un caso,
   **EL sistema DEBERÁ** denegar la operación en la función de base de datos, no solo en
   la interfaz.
4. **CUANDO** un caso incluya evidencias, **EL sistema DEBERÁ** verificar que cada ruta
   pertenezca a la carpeta privada del creador y que el archivo exista en el bucket antes
   de referenciarlo.
5. **CUANDO** el consejo consulte la bandeja PQRS, **EL sistema DEBERÁ** mostrar
   únicamente los casos creados por ese usuario.
6. **CUANDO** un residente consulte la bandeja PQRS, **EL sistema DEBERÁ** mostrar
   únicamente los casos de su unidad vigente.
7. **CUANDO** un residente o miembro del consejo consulte evidencias, **EL sistema
   DEBERÁ** autorizar solo los archivos que ese usuario cargó; la administración consulta
   todas las del conjunto.
8. **CUANDO** falle el registro del caso tras subir imágenes, **EL sistema DEBERÁ**
   permitir retirar los archivos ya cargados (reversión desde el cliente).
9. **CUANDO** una evidencia ya esté referenciada por un caso, **EL sistema DEBERÁ**
   impedir que el consejo o el residente que la cargó la borre; retirar evidencia de un
   expediente queda reservado a la administración.
10. **CUANDO** se invoque la función de creación directamente (sin pasar por la
    interfaz), **EL sistema DEBERÁ** validar título, categoría, prioridad (incluido
    `null`), tope de casos del escenario y pertenencia de las evidencias.
