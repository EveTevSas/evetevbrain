# Manual de redacción de la base documental

Este es el documento que se le entrega a quien va a mantener la base — hoy el
equipo de Evetev, mañana el cliente que compre el asistente. Si lo lees entero
puedes escribir y mantener el corpus sin saber nada del motor.

**La idea en una frase:** el asistente no sabe nada; la base es la que sabe. Todo
lo que el asistente afirma sale de estos archivos, así que **escribirlos es
programarlo**.

---

## 1. Un documento

Un archivo Markdown con un bloque de frontmatter arriba:

```markdown
---
id: evepay-que-es
titulo: Qué es EvePay
producto: evepay
audiencia: comercio
vigencia: 2027-06-30
fuente: sitio-web
confianza: alta
---

## Qué es EvePay

EvePay es la pasarela de pagos de Evetev…
```

| Campo       | Qué significa                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`        | **Único en todo el corpus.** Es lo que el asistente cita, y lo que el verificador comprueba. Dos documentos con el mismo `id` rompen esa comprobación, así que la compilación falla. |
| `titulo`    | Para humanos y para los informes.                                                                                                                                                    |
| `producto`  | `empresa` · `evepay` · `eveconecta` · `legales`. Filtra la búsqueda antes de responder.                                                                                              |
| `audiencia` | `general` · `comercio` · `residente` · `desarrollador` · `candidato`.                                                                                                                |
| `vigencia`  | Fecha después de la cual el documento sale en el informe de vencidos y **baja solo a confianza media**. No es opcional: es lo que impide que la base envejezca en silencio.          |
| `fuente`    | De dónde salió la afirmación: `sitio-web`, `manual-de-marca`, `constitucion`, `decision-john-<fecha>`. Si no puedes nombrar una fuente, no escribas la afirmación.                   |
| `confianza` | `alta` o `media`. Un documento de confianza media **nunca se cita sin derivar además a una persona**. Sirve para lo que es cierto pero está en movimiento.                           |

## 2. Cómo se escribe el cuerpo

- **Un `##` por idea.** Cada encabezado y su cuerpo se convierten en un fragmento
  buscable independiente. Si una sección responde dos preguntas distintas, son dos
  secciones.
- **200 a 350 palabras por sección.** Más largo y la sección compite consigo
  misma en la búsqueda; más corto y le falta contexto para entenderse sola.
- **Escribe la respuesta, no el folleto.** «EvePay cobra un porcentaje por
  transacción más un componente fijo» sirve. «EvePay revoluciona la forma en que
  tu negocio se relaciona con el dinero» no le sirve a nadie y ensucia la
  búsqueda.
- **Que cada sección se entienda sola.** Quien la lee —el modelo— no ve el resto
  del documento. Nada de «como se dijo arriba».
- **Repite el vocabulario de quien pregunta.** Si la gente dice «comisión», usa
  «comisión» además de «tarifa». La búsqueda léxica premia las palabras que la
  persona realmente escribe.

## 2 bis. Escribe con las palabras de quien pregunta

**La regla que más veces ha fallado.** Un documento escrito en el vocabulario de
la empresa no lo encuentra quien pregunta con el suyo.

Dos casos reales, los dos detectados por los tests y no razonando:

| La gente pregunta                             | El documento decía                     | Qué pasaba                                       |
| --------------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| «¿qué pasa si mi **cliente paga** dos veces?» | «reintentar nunca **cobra** dos veces» | Se abstenía, o traía el documento equivocado     |
| «¿cuánto **cobran** por el asistente?»        | «cómo se **cobra** el asistente»       | Se abstenía con el documento correcto ya escrito |

La búsqueda léxica no conjuga verbos ni adivina sinónimos, y hacerlo con
agresividad rompe más de lo que arregla —confundiría «pasarela» con «pasar»—. La
salida no es forzar el buscador: **es escribir la frase también como la dice la
gente**, aunque suene redundante.

```markdown
Reintentar nunca cobra dos veces: el reintento devuelve el cobro que ya existía.

Dicho como lo pregunta un comercio: **si tu cliente paga dos veces, o le da al
botón dos veces, no se le cobra dos veces.**
```

Ese segundo párrafo no es relleno: es lo que hace que la pregunta encuentre la
respuesta.

**Cómo se detecta:** cada vez que se agregan documentos, **cambia el peso de las
palabras en todo el corpus** y preguntas que antes funcionaban pueden dejar de
hacerlo. Pasó al añadir la línea de Eve Intelligence: dieciocho fragmentos nuevos
bastaron para que «paga dos veces» dejara de encontrar el documento de
idempotencia. Por eso los conjuntos de evaluación corren en cada cambio de la
base — sin ellos, esa regresión sale a la luz cuando la encuentra un cliente.

## 3. Las seis reglas de contenido

Están en `_reglas.json` y **se comprueban al compilar**. No son recomendaciones:
si una falla, el documento no entra.

| #   | Regla                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Frontmatter completo** y con valores de las listas permitidas.                                                                                                                |
| 2   | **`id` único** en todo el corpus.                                                                                                                                               |
| 3   | **Frases vetadas.** Cosas que la compañía ya decidió que no dice. Para Evetev: «tarifa fija sin porcentaje», «cero comisiones», «el mejor del mercado».                         |
| 4   | **Disponibilidad.** Toda frase que hable de que algo está en producción o disponible tiene que llevar la negación en la misma frase, mientras el producto siga en construcción. |
| 5   | **Tarifas.** Toda cifra o modelo de cobro va con la palabra «referencia» y con una derivación a **cotización**. Nunca un precio en firme.                                       |
| 6   | **Sin promesas de fecha y sin competidores.** Ni «lanzamos en», ni un mes con año, ni el nombre de otra pasarela fuera de `legales/`.                                           |

### Lo que aprendimos escribiendo las reglas

Las tres primeras versiones de estas reglas **marcaron texto correcto**, y vale la
pena saberlo antes de escribir las tuyas:

- Vetar la subcadena «en producción» marcaba _«ninguno está en producción
  todavía»_, que es exactamente la frase que queremos. La regla correcta no es
  prohibir la palabra: es **exigir la negación en la misma frase**.
- Disparar la regla de tarifas con un `%` suelto marcaba _«checkout 100%
  accesible»_, que no habla de plata. Se dispara por **contexto de tarifa** o por
  una cifra con decimales.
- Vetar «sale en» marcaba _«la cifra exacta sale en la demo»_. Una frase corta y
  común da más ruido que señal.

Y una decisión de criterio: cuando una regla estricta chocó con una palabra bonita
—«su tarifa y su depósito» para la reserva del salón social— **se cambió la
palabra, no la regla**. Aflojar la guarda para salvar una frase es como se
degradan estos sistemas.

## 4. Los cuatro archivos con guion bajo

No son documentos consultables: son la configuración del asistente.

- **`_sistema.md`** — el prompt de anclaje. Todo lo que va bajo `## Prompt` se
  envía al modelo tal cual. Cambiar una línea cambia el comportamiento en
  producción.
- **`_limites.md`** — los temas que el asistente no responde, **con la respuesta
  ya escrita**. No se le pide al modelo que juzgue si algo es asesoría legal: se
  detecta el tema y sale el texto fijo.
- **`_selladas.md`** — preguntas frecuentes con respuesta literal, que salen sin
  llamar al modelo. Son las más rápidas, las más baratas y las únicas con cero
  riesgo de invención: **todo lo que puedas sellar, séllalo**.
- **`_reglas.json`** — las reglas de arriba en forma legible por máquina.

`_selladas.md` **sí** cumple las seis reglas, porque su texto es el que la persona
recibe. `_sistema.md` y `_limites.md` están exentos: describen las prohibiciones,
así que las contienen por definición.

## 5. El flujo de trabajo

1. Escribes o cambias un documento en una rama corta.
2. Recompilas el índice **en el mismo cambio**. Si la base y el índice se separan,
   el asistente responde con la versión vieja y nada se pone rojo.
3. Abres un PR. Si tocaste `empresa/`, `legales/` o cualquier cifra, se marca como
   que **requiere revisión de contenido**.
4. La evaluación corre sola y bloquea si el asistente empeora.

**Regla dura:** un cambio en `base/` es una afirmación sobre la compañía, no
maquetación. Retirar un producto de la vitrina no autoriza a reescribir lo que la
compañía dice que es.

## 6. Los errores que más cuestan

| Error                                     | Qué provoca                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| Escribir una afirmación sin fuente        | El asistente la repite con total seguridad y nadie sabe de dónde salió              |
| Documento sin `vigencia` realista         | La base envejece en silencio, que es la forma más cara de equivocarse               |
| Una sección que responde tres preguntas   | La búsqueda la trae para las tres y acierta en ninguna                              |
| Copiar el folleto de ventas               | Adjetivos que no responden nada y ensucian el índice                                |
| Documentar lo que **todavía no existe**   | El asistente promete producto. Si es hoja de ruta, va con `confianza: media`        |
| Sintetizar dos fuentes que se contradicen | **No lo hagas.** Deja el documento sin escribir y sube el conflicto a quien aprueba |

El último no es hipotético: al escribir este corpus, la página de EvePay y la
constitución de ingeniería contaban **dos historias distintas** sobre quién procesa
los pagos. El documento correspondiente se quedó sin escribir a propósito, y el
conflicto está anotado en la spec.
