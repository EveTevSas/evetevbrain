# Base documental de Fluxi

## Problema

Fluxi responde **solo** con lo que hay en su base documental. Eso convierte al
corpus en el producto: si la base miente, envejece o se contradice, el asistente
miente, envejece o se contradice con total seguridad y buena redacción, que es la
peor forma de equivocarse de cara a un cliente.

Hoy la información de Evetev vive repartida en cuatro páginas HTML, un manual de
marca y una constitución de ingeniería, y **ya diverge entre sí** (ver _Hallazgos_
abajo). Esta spec define el formato, las reglas de contenido y las
comprobaciones automáticas que hacen de esa base algo verificable.

## Usuarios / actores

| Actor                                         | Qué hace con la base                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Visitante de `evetev.com`                     | La consume sin saber que existe: pregunta y recibe una respuesta anclada a ella. |
| Quien redacta (hoy Evetev, mañana el cliente) | Escribe y mantiene los documentos siguiendo el manual de redacción.              |
| Quien aprueba (John)                          | Revisa por PR todo lo que afirme algo sobre la compañía, tarifas o plazos.       |
| El compilador (`scripts/compilar.ts`)         | Valida, trocea, contextualiza y vectoriza. Falla ruidosamente.                   |
| La CI                                         | Bloquea el merge si la base rompe una regla o el índice quedó desincronizado.    |

## Resultado esperado

Un corpus de 25–35 documentos donde **cada afirmación tiene fuente y fecha de
caducidad**, donde las reglas de contenido que ya nos costaron una corrección
están comprobadas por código y no por memoria, y donde un documento nuevo entra
por PR con la misma ceremonia que un cambio de código.

## Requisitos funcionales

### Formato

- Un documento es un archivo Markdown con frontmatter YAML en `apps/rag-assistant/base/`.
- Campos obligatorios: `id`, `titulo`, `producto`, `audiencia`, `vigencia`,
  `fuente`, `confianza`.
- `producto` ∈ `empresa · evepay · eveconecta · legales`.
- `audiencia` ∈ `general · comercio · residente · desarrollador · candidato`.
- `confianza` ∈ `alta · media`. Un fragmento de confianza media **nunca** se cita
  sin derivar además a una persona.
- `fuente` nombra de dónde salió la afirmación: `sitio-web`, `manual-de-marca`,
  `constitucion`, `decision-john-<fecha>`.
- El troceo es por sección (`##`), objetivo 200–350 tokens.

### Los tres archivos con guion bajo

No son documentos consultables: son configuración del asistente y se compilan
aparte.

- `_sistema.md` — el prompt de anclaje. Versionado y revisado por PR como
  cualquier otro documento del corpus.
- `_limites.md` — los temas que Fluxi no responde, **con la respuesta ya
  redactada**. No se le pide al modelo que juzgue si algo es asesoría legal: se
  detecta el tema y se responde con texto fijo.
- `_selladas.md` — preguntas frecuentes con respuesta literal, que se devuelven
  sin llamar al modelo.

### Reglas de contenido (comprobables)

| Regla                                                      | Comprobación                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Las tarifas son **de referencia**, nunca precio en firme   | Un documento que contenga un símbolo de moneda o un porcentaje debe contener también la palabra «referencia» y una derivación a cotización |
| Prohibido decir «tarifa fija sin porcentaje» o equivalente | Lista de frases vetadas; la compilación falla                                                                                              |
| EvePay **no está en producción**                           | Ningún documento puede afirmar que EvePay está disponible, en vivo o en producción                                                         |
| Las tres líneas se confirman, dos productos se explican    | Existe exactamente un documento que enumera las tres líneas, y IA empresarial y comercio electrónico no tienen ficha de producto           |
| Sin comparaciones con competidores                         | Lista de nombres vetados (pasarelas y bancos) fuera de `legales/`                                                                          |
| Sin promesas de fecha                                      | Frases vetadas: «estará listo en», «lanzamos en», y meses con año                                                                          |

## No-objetivos

- **No** se documenta nada interno: arquitectura, proveedores, credenciales,
  decisiones de la constitución, nombres del equipo, cifras de negocio. La base es
  material público; si no está publicado, no entra.
- **No** hay panel de administración. La base se edita por PR. Un panel entra en
  la fase 5, y solo si un cliente lo pide.
- **No** se escribe ficha de producto de IA empresarial ni de comercio
  electrónico. Se confirma que existen y se deriva.
- **No** se traduce. Español de Colombia, una sola versión.

## Casos borde

- **Dos documentos con el mismo `id`.** La compilación falla nombrando los dos
  archivos: un `id` duplicado rompe la verificación de citas.
- **Documento vencido.** Sigue respondiéndose, pero baja a confianza media y sale
  en el informe mensual. Sacarlo del índice sin avisar sería peor: el asistente
  se quedaría mudo sobre algo que sí sabe.
- **Pregunta que cruza dos productos** («¿EveConecta usa EvePay?»). Los
  metadatos filtran antes de fusionar, así que se prevé un documento puente
  explícito en lugar de confiar en que la recuperación los junte.
- **Fuentes que se contradicen.** Es el caso real de hoy (ver abajo). La regla:
  **no se inventa la síntesis**. El documento se queda sin escribir y el conflicto
  sube a quien aprueba.
- **La persona escribe su cédula en el chat.** Se redacta antes de registrar el
  evento; la base no cambia.

## Criterios de aceptación (EARS)

- **CUANDO** un documento carece de alguno de los siete campos del frontmatter,
  **EL** compilador **DEBERÁ** fallar indicando el archivo y el campo que falta.
- **CUANDO** dos documentos declaran el mismo `id`, **EL** compilador **DEBERÁ**
  fallar nombrando ambos archivos.
- **CUANDO** un documento contiene una frase de la lista vetada —«tarifa fija sin
  porcentaje», una promesa de fecha, el nombre de un competidor—, **EL**
  compilador **DEBERÁ** fallar citando la frase y la línea.
- **CUANDO** un documento menciona una cifra de tarifa sin la palabra
  «referencia» ni una derivación a cotización, **EL** compilador **DEBERÁ**
  fallar.
- **CUANDO** un documento supera su fecha de `vigencia`, **EL** sistema
  **DEBERÁ** incluirlo en el informe mensual de vencidos y degradar sus
  fragmentos a `confianza: media`.
- **CUANDO** un fragmento de `confianza: media` sustenta una respuesta, **EL**
  sistema **DEBERÁ** añadir la derivación a una persona.
- **CUANDO** se pregunta por inteligencia artificial empresarial o comercio
  electrónico, **EL** sistema **DEBERÁ** confirmar que Evetev opera esa línea,
  **no** detallar producto ni precios, y ofrecer el formulario de contacto.
- **CUANDO** se pregunta si EvePay ya se puede usar, **EL** sistema **DEBERÁ**
  responder que todavía no está en producción y ofrecer el piloto.
- **CUANDO** un PR modifica un documento con `producto: empresa`, o cualquiera que
  contenga tarifas, **EL** sistema **DEBERÁ** marcarlo como que requiere revisión
  de contenido antes de mezclar.
- **CUANDO** `base/` cambia y `indice/` no se recompila en el mismo PR, **EL**
  sistema **DEBERÁ** fallar la CI.

## Restricciones de la constitución

- **§4 — datos personales (Ley 1581).** La base es material público y no contiene
  datos de personas. El aviso de privacidad del chat vive en `legales/`.
- **§1.5 — no sobre-ingeniar.** El formato es Markdown con frontmatter, no un CMS.
- **§9 — SDD.** Cada regla comprobable de arriba se convierte en un test del
  compilador; no se inventan tests aparte.
- **Manual de marca.** Fluxi es el motor; **Eve** es la mascota y la voz en
  `evetev.com`. La base habla de «Eve» cuando se refiere al asistente de cara al
  público.

## Hallazgos que bloquean parte del contenido

Al leer las cuatro fuentes públicas apareció una **divergencia real** que esta
spec no puede resolver sola:

| Fuente                                         | Qué dice sobre la adquirencia y la tokenización                                                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/website/evepay/index.html` (landing)     | «Integración con **Credibanco y Redeban** (adquirencia directa)» · «Tokenización como Servicio (TaaS) con proveedores como **VGS y Basis Theory**» · métodos locales PSE, Nequi y Bre-B en fases posteriores |
| `docs/ESTANDARES_INGENIERIA.md` §7, decisión 5 | **Akua** como backbone, **único proveedor, sin agregador intermedio**, detrás de la interfaz `PaymentProvider`. La tokenización es la de Akua, y es lo que nos deja fuera de PCI                             |
| `apps/website/index.html` (FAQ)                | «checkout embebido **del proveedor**», sin nombrarlo                                                                                                                                                         |

Son **dos historias distintas** sobre quién procesa y quién tokeniza.

**Resuelto el 19 de agosto de 2026:** John confirmó que **Akua es lo vigente y la
landing de EvePay está desactualizada**. De ahí salen dos consecuencias distintas:

1. **El corpus sí puede describir la arquitectura**, y `evepay/adquirencia.md`
   queda escrito: un único backbone de adquirencia, sin agregadores intermedios,
   con su tokenización y su checkout embebido.
2. **Pero sigue sin nombrar al proveedor.** El nombre no aparece en ninguna página
   de producto, y la regla de esta spec es que al corpus solo entra material
   público. Nombrarlo sería estrenar el asistente filtrando algo que la compañía
   todavía no ha publicado.

Queda abierto fuera de esta spec: **la landing publica dos afirmaciones que la
decisión vigente contradice**, y corregirlas es copia pública sobre quién procesa
los pagos.

Es exactamente el fallo que esta spec existe para atrapar, y apareció en el primer
día de corpus.
