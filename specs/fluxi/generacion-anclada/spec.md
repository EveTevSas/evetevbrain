# Generación anclada y verificación de la salida

## Problema

Cuando la compuerta deja pasar, hay que llamar al modelo — y a partir de ahí lo
que salga lo escribe él. El anclaje no puede depender de que obedezca: tiene que
comprobarse.

## Usuarios / actores

| Actor                   | Qué espera                                                             |
| ----------------------- | ---------------------------------------------------------------------- |
| Quien pregunta          | Una respuesta corta, cierta, con de dónde salió                        |
| Quien opera             | Que una respuesta que se sale del material **no llegue a la pantalla** |
| Quien vende el producto | Poder decir «no inventa» y respaldarlo con código, no con un prompt    |

## Resultado esperado

El modelo recibe **solo** los fragmentos recuperados y la pregunta. Lo que
escribe pasa por tres comprobaciones antes de mostrarse; si falla alguna, se
descarta entero y sale la derivación de siempre.

## Requisitos funcionales

- El prompt de sistema sale de `base/_sistema.md`, **solo** lo que va bajo
  `## Prompt`. El resto del archivo explica los verificadores y es para nosotros.
- Los fragmentos van en el mensaje del **usuario**, no en el del sistema: así el
  sistema es idéntico entre peticiones y el caché de contexto acierta.
- **Verificación de citas**: todo `[#id]` debe estar entre los fragmentos
  entregados.
- **Verificación de cifras**: todo número de la respuesta debe aparecer en el
  contexto. Las citas se quitan antes de buscar, o el `#2` de un identificador
  contaría como cifra.
- **Verificación de enlaces**: todo enlace o correo debe estar en el contexto
  **o** en el prompt de sistema.
- Un fragmento de `confianza: media` obliga a añadir la derivación a una persona.
- El motor va detrás de una interfaz: cambiar de proveedor es cambiar un archivo.

## No-objetivos

- **Reintentar** cuando la verificación falla. Degradar a la derivación es más
  barato, más rápido y no puede empeorar.
- **Historial largo.** La v1 responde sobre el turno.
- **Herramientas.** Fluxi no consulta cuentas ni ejecuta operaciones.

## Casos borde

- **El modelo devuelve texto vacío.** Pasa de verdad: los modelos de Kimi razonan
  antes de responder y ese razonamiento consume el presupuesto de salida. Con el
  tope en 220 tokens la primera llamada real devolvió vacío habiéndolos gastado
  los 220. Se apaga el razonamiento.
- **El modelo escribe el correo de contacto** que el propio prompt le manda
  ofrecer, y ese correo no está en los fragmentos. **No es un invento**: el
  conjunto válido es contexto ∪ prompt.
- **El proveedor no admite `temperature`.** `kimi-k2.6` responde 400 si se le
  manda distinta de 1. El parámetro es opcional y no se envía si no está.

## Criterios de aceptación (EARS)

- **CUANDO** la respuesta del modelo cita un identificador que no estaba entre
  los fragmentos entregados, **EL** sistema **DEBERÁ** descartarla entera y
  devolver la derivación.
- **CUANDO** la respuesta contiene una cifra que no aparece en el contexto,
  **EL** sistema **DEBERÁ** descartarla entera y devolver la derivación.
- **CUANDO** la respuesta contiene un enlace que no está ni en el contexto ni en
  el prompt de sistema, **EL** sistema **DEBERÁ** descartarla y derivar.
- **CUANDO** algún fragmento entregado es de `confianza: media`, **EL** sistema
  **DEBERÁ** añadir la derivación a una persona al final de la respuesta.
- **CUANDO** el camino no es de generación, **EL** sistema **DEBERÁ** devolver la
  respuesta **sin llamar** al modelo.

## Restricciones de la constitución

- **§4 — secretos.** La llave del modelo vive en el entorno, nunca en el repo.
- **§1.5 — no sobre-ingeniar.** Cliente HTTP propio, sin SDK.
- **§9 — SDD.** Los cinco criterios están cubiertos por tests con un motor falso,
  sin red y sin gastar tokens.
