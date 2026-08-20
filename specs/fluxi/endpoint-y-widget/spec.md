# Endpoint público y widget embebible

## Problema

El motor ya responde en la terminal. Falta lo que lo convierte en producto: un
endpoint que cualquier web pueda consultar y un widget que se instale con una
línea — sin que eso abra la puerta a que un desconocido gaste nuestro
presupuesto.

## Usuarios / actores

| Actor                                       | Qué espera                                                |
| ------------------------------------------- | --------------------------------------------------------- |
| Quien visita el sitio                       | Preguntar y recibir respuesta sin instalar ni registrarse |
| Quien instala el widget                     | Una línea de `<script>` y que no le rompa su CSS          |
| Quien paga la factura                       | Que un guion no pueda vaciar el presupuesto en una tarde  |
| Quien usa lector de pantalla o solo teclado | Poder usarlo entero (§5)                                  |

## Resultado esperado

`POST /api/chat` devuelve la respuesta **transmitida por frases ya
verificadas**, y `fluxi.js` la pinta dentro de un Shadow DOM con la marca del
cliente. Sin JavaScript, sin llave o con la API caída, aparece el enlace de
contacto — que es lo que el muñeco de la esquina hacía antes.

## Requisitos funcionales

- `POST /api/sesion` emite un token firmado; `POST /api/chat` lo exige.
- `GET /api/salud` responde sin exigir origen: tiene que poder comprobarse desde
  fuera.
- Lista de orígenes permitidos, con previews de Vercel y `localhost`.
- Cupos por sesión e IP, y presupuesto diario de tokens.
- Campo trampa: responde 200 y no hace nada.
- El widget vive en un Shadow DOM, se configura por atributos `data-`, y es
  operable solo con teclado.
- El texto visible **no lleva identificadores**: las fuentes se muestran con su
  nombre.

## No-objetivos

- **Autenticación.** El token de sesión no es una puerta y no lo pretende:
  cualquiera puede pedir uno. Obliga a dos viajes y da una identidad a la que
  colgarle el cupo.
- **Cupo duradero.** El contador vive en memoria del proceso; en Vercel hay
  varias instancias y son efímeras. Es un badén, no una barrera, y entra al
  almacén compartido junto con el registro de eventos.
- **Historial entre sesiones.** La v1 responde sobre el turno.
- **Multi-cliente.** Una instalación, una base. La fase 5.

## Casos borde

- **La verificación falla a mitad del flujo.** Lo ya emitido estaba verificado;
  se corta ahí y detrás va la derivación. **Nunca se muestra texto sin
  verificar.**
- **El proveedor del modelo falla.** Si ya se emitió algo, se cierra el turno; si
  no, sale la derivación.
- **Falta la llave del modelo.** Selladas y límites siguen funcionando; el resto
  deriva.
- **Un fragmento de confianza media** sustenta la respuesta → se añade la
  derivación a una persona.

## Criterios de aceptación (EARS)

- **CUANDO** llega una petición desde un origen que no está en la lista, **EL**
  sistema **DEBERÁ** responder 403 sin llamar al modelo.
- **CUANDO** llega una petición a `/api/chat` sin token de sesión válido, **EL**
  sistema **DEBERÁ** responder 401 sin llamar al modelo.
- **CUANDO** una sesión supera su cupo, **EL** sistema **DEBERÁ** responder 429
  **con la derivación al formulario**, no con un error seco.
- **CUANDO** una frase generada no pasa la verificación, **EL** sistema
  **DEBERÁ** dejar de emitir y añadir la derivación, sin borrar lo ya mostrado.
- **CUANDO** falta la llave del modelo, **EL** sistema **DEBERÁ** seguir
  respondiendo las preguntas selladas y los temas vetados.
- **CUANDO** la API no responde, **EL** widget **DEBERÁ** mostrar el enlace de
  contacto y seguir siendo operable.

## Restricciones de la constitución

- **§5 — accesibilidad.** Teclado, foco devuelto al cerrar, `aria-live` sobre la
  respuesta, contraste AA, objetivos de 44 px, 320 px de ancho,
  `prefers-reduced-motion`.
- **§4 — secretos.** Llave y secreto de firma en el entorno, nunca en el repo.
- **Manual de marca.** El coral **no** aparece: es exclusivo del CTA global del
  nav (regla C2). La mascota entra por el CDN (regla T1).
