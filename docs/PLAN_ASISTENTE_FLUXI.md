# Plan de desarrollo — Fluxi (asistente RAG)

Plan de construcción de **Fluxi**, el asistente de IA de recuperación aumentada
(RAG) que hoy es un muñeco en la esquina de `evetev.com` y que va a convertirse en
**el tercer producto vendible de Evetev**. Se ejecuta con **Spec-Driven
Development** (constitución §9). Este documento es el mapa; cada feature real vive
en `specs/fluxi/<feature>/`.

> Fuente de verdad: [`ESTANDARES_INGENIERIA.md`](./ESTANDARES_INGENIERIA.md)
> (§1 principios, §2 stack, §4 seguridad y datos personales, §5 accesibilidad,
> §9 SDD, §10 despliegue). Manual de marca:
> `packages/brand/assets/evetev_brand_styles.md`.

---

## 0. Qué es Fluxi y qué no es

**Es** un motor de respuesta anclado a una base documental cerrada. Se le da un
corpus escrito por nosotros; responde **solo** con lo que está ahí, cita de dónde
lo sacó, y cuando no lo tiene lo dice y deriva a una persona.

**No es** un chatbot de propósito general con la personalidad de Evetev encima. La
diferencia no es de tono, es de arquitectura: el modelo no aporta conocimiento,
aporta redacción. Todo lo que afirma sale del contexto que le pasamos en esa
misma petición.

**Por qué se construye así y no más simple.** El asistente de `evetev.com` es al
mismo tiempo el escaparate del producto. Un cliente que pregunte «¿y esto no se
inventa cosas?» tiene que poder ver la respuesta: el informe de evaluación, la
tasa de abstención, el registro de citas verificadas. Ese informe es el producto
tanto como el widget.

### Nombres (decidido)

| Nombre    | Qué es                                                                                                    | Dónde aparece                                               |
| --------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Fluxi** | El **motor**: base documental + recuperación + guardas + widget. Es lo que se vende, en marca blanca.     | `apps/rag-assistant`, documentación, propuestas comerciales |
| **Eve**   | La **voz** en `evetev.com`: la mascota gato-robot del manual de marca, «el rostro del asistente digital». | La burbuja de `index.html`, la copia de cara al público     |

El manual de marca **no se toca**: Eve sigue siendo la mascota y la cara del
asistente en nuestro sitio. Fluxi es el nombre del motor que la mueve, y el que
lleva la factura cuando se le instala a otra empresa con su propia cara.

---

## 1. Decisiones cerradas

Se decidieron el 19 de agosto de 2026 y **no se rediscuten salvo dolor real y
demostrable** (misma regla del §7 de la constitución). Cambiar una es un PR sobre
este documento con la justificación.

| #   | Decisión                           | Elegido                                                        | Por qué                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dónde vive                         | **`apps/rag-assistant`**, proyecto propio en Vercel            | Independiente desde el día uno. `evetev.com` lo consume **igual que lo haría un cliente** (dogfooding, §1.4). Si viviera dentro de `apps/website`, el día de la primera venta habría que separar base documental de motor con el producto ya en producción.                                                                                                         |
| 2   | Proveedor de modelo                | **Kimi (Moonshot)** genera · **Qwen (Model Studio)** vectoriza | Ningún proveedor de los tres evaluados cubre las dos capas: **ni DeepSeek ni Kimi tienen endpoint de embeddings**, solo `chat/completions`. Como hacen falta dos cuentas de todos modos, la generación va donde ya hay cuenta funcionando y pagada —Moonshot, el motor de `eve-studio`— y los embeddings donde sí los hay. Las dos APIs son compatibles con OpenAI. |
| 3   | Lenguaje                           | **TypeScript**, runtime Node en Vercel                         | El §2 lo fija como base end-to-end y aquí ninguna librería exige Python: BM25, coseno y el cliente HTTP son código nuestro. Evita el arranque en frío de Python que ya cargamos en `eve-studio`.                                                                                                                                                                    |
| 4   | Almacén de vectores                | **Índice compilado en el repo**, no base de datos              | Con ~400 fragmentos, la matriz cuantizada a int8 pesa ~200 KB y viaja dentro del paquete de la función: recuperación en **microsegundos, sin red y sin costo**. `pgvector` (§2) entra detrás de la misma interfaz cuando un corpus lo pida — hoy sería infraestructura para nada.                                                                                   |
| 5   | Recuperación                       | **Híbrida BM25 + densa, fusionadas con RRF**                   | Léxico y semántica fallan en sitios distintos: el híbrido cubre los dos huecos y RRF fusiona por **posición**, no por puntaje, que es lo que evita el problema de escalas incompatibles. Es el estándar de 2026 y además el BM25 corre en proceso, sin latencia.                                                                                                    |
| 6   | Alcance de la base                 | **Las tres líneas de negocio**                                 | La web ofrece dos productos, la empresa opera tres. Fluxi confirma que Evetev hace IA empresarial y comercio electrónico, **sin detallar producto ni precios**, y deriva al formulario. Coherente con #79: retirar algo de la vitrina no borra lo que la compañía hace.                                                                                             |
| 7   | Dependencias en el camino caliente | **Cero**                                                       | Solo Zod en la frontera de entrada (§2). BM25, coseno, RRF y el cliente del modelo son ~400 líneas propias. Un motor que se vende tiene que poder leerse entero en una tarde y no arrastrar la cadena de suministro de nadie.                                                                                                                                       |

### Lo que queda abierto

- **Nivel de modelo generador.** `eve-studio` usa `kimi-k3`, que cuesta
  **US$3,00/M de entrada sin caché y US$15,00/M de salida** — un modelo de
  razonamiento con 1M de contexto para leer seis fragmentos y escribir tres
  frases. Es la tarea más barata que hay, así que la fase 1 mide `kimi-k3`
  contra un nivel inferior de Moonshot y contra un modelo de Qwen, y se elige
  con datos. La interfaz `Motor` deja el cambio en un archivo.
- **Caché de contexto, obligatorio.** El prompt de sistema es idéntico en cada
  petición y en Kimi la entrada con acierto de caché cuesta **10× menos**
  (US$0,30/M frente a US$3,00/M). Sin caché el motor cuesta lo que no debe.
- **Umbral de la compuerta de abstención**: se calibra con datos en la fase 1.
- **Precio de venta del producto**: se fija en la fase 5, cuando el costo por
  respuesta esté medido en producción y no estimado.

---

## 2. Arquitectura

```
navegador (widget)                apps/rag-assistant           Model Studio · Moonshot
      │                                   │                                  │
      │ POST /api/chat {pregunta, sesión} │                                  │
      │──────────────────────────────────►│ 1 GUARDAS DE ENTRADA             │
      │                                   │   origen · longitud · cupo · HMAC│
      │                                   │                                  │
      │                                   │ 2 ¿RESPUESTA SELLADA? ─── sí ──► devuelve  (~40 ms, 0 tokens)
      │                                   │        │ no                       │
      │                                   │ 3 RECUPERACIÓN EN PARALELO        │
      │                                   │   ├─ BM25 en proceso     (<5 ms) │
      │                                   │   └─ embed de consulta ──────────►│ text-embedding-v4 · 512d
      │                                   │      coseno int8 (<2 ms) ◄────────│
      │                                   │ 4 FUSIÓN RRF (k=60) → top 6       │
      │                                   │                                  │
      │                                   │ 5 COMPUERTA ─── bajo umbral ──► deriva al formulario (0 tokens)
      │                                   │        │ pasa                     │
      │                                   │ 6 GENERACIÓN ────────────────────►│ kimi-… T=0, tope 220 tokens
      │◄═════ SSE, token a token ═════════│◄─────────────────────────────────│
      │                                   │ 7 VERIFICACIÓN DE SALIDA          │
      │                                   │   citas existen · cifras del contexto
      │                                   │ 8 EVENTO AL REGISTRO              │
```

**Lo importante del dibujo:** hay **dos salidas que no llegan al modelo**. Las
respuestas selladas (paso 2) y la compuerta de abstención (paso 5) resuelven la
mayor parte del tráfico real de un sitio corporativo sin gastar un token y sin
posibilidad de invención. El modelo solo entra cuando hay material recuperado que
lo respalde.

### Árbol de la app

```
apps/rag-assistant/
├── base/                     # LA BASE DOCUMENTAL — fuente de verdad, en git
│   ├── _sistema.md           #   prompt de anclaje (versionado, revisado por PR)
│   ├── _limites.md           #   lo que NO responde y qué dice en su lugar
│   ├── _selladas.md          #   preguntas frecuentes con respuesta literal
│   ├── empresa/              #   quiénes somos · líneas de negocio · contacto
│   ├── evepay/               #   qué es · para quién · cómo funciona · tarifas
│   ├── eveconecta/
│   └── legales/              #   habeas data · términos
├── indice/
│   ├── indice.json           # fragmentos + metadatos + postings BM25 (compilado)
│   └── vectores.bin          # matriz int8 512d (compilado)
├── src/
│   ├── ingesta/              # trocear · contextualizar · vectorizar · compilar
│   ├── recuperar/            # bm25.ts · denso.ts · rrf.ts · compuerta.ts
│   ├── generar/              # motor.ts (interfaz) · qwen.ts · plantilla.ts
│   ├── guardas/              # entrada.ts · salida.ts · cupos.ts
│   └── registro/             # eventos.ts
├── api/
│   ├── chat.ts               # el endpoint (SSE)
│   ├── sesion.ts             # emite el token HMAC de sesión
│   └── salud.ts
├── public/
│   ├── fluxi.js              # el widget embebible: un solo <script>
│   └── demo.html             # banco de pruebas
├── eval/
│   ├── dorado.jsonl          # preguntas con respuesta y fragmentos esperados
│   ├── fuera-de-alcance.jsonl
│   ├── ataques.jsonl         # inyección de prompt y jailbreak
│   └── correr.ts
├── scripts/compilar.ts       # base/ → indice/   (se corre a mano, se commitea)
├── vercel.json · package.json · README.md · .env.example
```

**El índice se compila y se commitea.** No es un artefacto de build: es un archivo
revisable, con historia y con `git revert`. Compilarlo en cada despliegue nos
ataría a que Model Studio esté arriba justo cuando desplegamos, y gastaría
embeddings en cada push. Se recompila cuando cambia `base/`, en el mismo PR, y la
CI verifica que índice y base estén sincronizados.

---

## 3. La base documental

Es el producto. El código es el vehículo.

### Formato

Markdown con frontmatter. Un archivo por tema, no por página web.

```markdown
---
id: evepay-que-es
titulo: Qué es EvePay
producto: evepay # evepay · eveconecta · empresa · legales
audiencia: comercio # comercio · residente · candidato · general
vigencia: 2026-12-31 # después de esta fecha el documento sale en el informe de vencidos
fuente: manual-de-marca # de dónde salió la afirmación
confianza: alta # alta · media — «media» nunca se cita sin derivar a una persona
---

EvePay es la plataforma de pagos de Evetev…
```

### Troceo (chunking)

- **Por sección semántica**, no por número de caracteres: un encabezado `##` y su
  cuerpo son un fragmento. Objetivo 200–350 tokens; si una sección se pasa, se
  parte por párrafo con solape de una frase.
- **Recuperación contextual**: antes de vectorizar, cada fragmento se antepone con
  dos o tres líneas generadas en la ingesta que lo sitúan en su documento
  («Este fragmento pertenece a la ficha de EvePay y explica a qué comercios va
  dirigido»). Es la técnica que más sube el acierto de recuperación en corpus
  pequeños, y **su costo se paga una sola vez**, en la compilación del índice.
- Los metadatos del frontmatter viajan con el fragmento y se usan para filtrar
  antes de fusionar.

### Reglas de contenido, específicas de Evetev

Estas no son estilo, son restricciones de negocio que ya nos costaron una
corrección:

| Regla                                                                                                                                                                            | Por qué                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Las tarifas del sitio son **de referencia**. Fluxi nunca las presenta como precio en firme y siempre deriva a una cotización.                                                    | El cotizador está oculto justamente porque las tarifas reales no están cerradas.  |
| **Prohibido decir «tarifa fija sin porcentaje».** EvePay cobra un porcentaje por transacción más un componente fijo, más suscripción.                                            | Lo fija el manual de marca; es información obsoleta que circuló.                  |
| Las **tres líneas de negocio** se confirman; **dos productos** se explican. IA empresarial y comercio electrónico existen, no tienen ficha de producto: se confirma y se deriva. | La web dejó de ofrecerlos en #78 sin que la empresa dejara de hacerlos (#79).     |
| Ninguna fecha, plazo ni compromiso comercial entra a la base sin fuente escrita.                                                                                                 | Una promesa de plazo dicha por un asistente es una promesa de la compañía.        |
| Nada de comparaciones con competidores, asesoría legal, tributaria ni financiera.                                                                                                | Va en `_limites.md` con la respuesta de derivación redactada palabra por palabra. |

### Gobernanza — regla dura

**Un cambio en `base/` es una afirmación sobre la compañía, no maquetación.** Todo
PR que toque `base/` requiere revisión explícita de John cuando afirme algo sobre
líneas de negocio, tarifas, plazos o alcance. La CI lo etiqueta solo: si el diff
toca `base/empresa/` o cualquier archivo con `producto: empresa`, el PR pide esa
revisión.

---

## 4. El cierre del ambiente: seis capas, no un prompt

«Que no responda nada fuera de la base» es un requisito de arquitectura. Un prompt
que lo pida es la capa más débil de las seis, y es la única que muchos productos
del mercado tienen.

| #   | Capa                        | Dónde vive               | Qué garantiza                                                                                                                                                                                          |
| --- | --------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Solo el contexto entra**  | `generar/plantilla.ts`   | El prompt no lleva conocimiento del mundo. Lo único que el modelo puede afirmar son los 6 fragmentos recuperados, con sus identificadores.                                                             |
| 2   | **Compuerta de abstención** | `recuperar/compuerta.ts` | Si ninguna señal de recuperación llega a su umbral, **no hay llamada al modelo**. Sale la respuesta de derivación. Es imposible inventar sobre algo que nunca se preguntó al modelo.                   |
| 3   | **Prompt de anclaje**       | `base/_sistema.md`       | Temperatura 0, tope de 220 tokens, respuesta de máximo tres frases, cita obligatoria, y la instrucción de decir «no lo tengo» sin adornar. Versionado y revisado por PR como cualquier otro documento. |
| 4   | **Verificación de citas**   | `guardas/salida.ts`      | Toda cita `[#id]` que el modelo escriba tiene que existir entre los fragmentos que se le pasaron. Si cita algo que no recibió, la respuesta se descarta y degrada a derivación.                        |
| 5   | **Regla de cifras**         | `guardas/salida.ts`      | Cualquier número, porcentaje o fecha en la respuesta tiene que aparecer literalmente en el contexto. Es la guarda que impide que una tarifa se «redondee».                                             |
| 6   | **Temas vetados**           | `base/_limites.md`       | Lista explícita con la respuesta ya redactada. No se le pide al modelo que juzgue si algo es asesoría legal: se detecta y se responde con texto fijo.                                                  |

### Regla dura heredada de Eve Studio

**Ninguna regla del prompt puede exigir al modelo algo que solo él pueda
verificar.** En `apps/eve-studio` la regla 13 decía «termina siempre indicando la
URL del PR que te devolvió la herramienta»; sin haber llamado a la herramienta, la
única forma de cumplirla era inventarse la URL. La regla que debía dar
trazabilidad fue la que fabricó el número.

Aquí eso se traduce en algo concreto: **no se le pide «cita siempre la fuente» y
se confía**. Se le pide, y la capa 4 comprueba en código que la cita exista. Toda
obligación del prompt tiene su verificador; si no se puede verificar, no se pide.

---

## 5. Recuperación y velocidad

### Presupuesto de latencia (objetivo)

| Etapa                                         | Objetivo                             |
| --------------------------------------------- | ------------------------------------ |
| Respuesta sellada (sin modelo)                | **< 60 ms**                          |
| BM25 en proceso                               | < 5 ms                               |
| Embedding de la consulta (red a Model Studio) | 150–350 ms · **con caché LRU: 0 ms** |
| Coseno int8 sobre ~400 vectores               | < 2 ms                               |
| Primer token del modelo                       | 400–900 ms                           |
| **p50 al primer token**                       | **< 1,2 s**                          |
| **p95 al primer token**                       | **< 2,5 s**                          |

**El punto frágil es el embedding de la consulta**: la petición sale de la región
de Vercel hasta Model Studio en Singapur. Dos mitigaciones, las dos en la fase 1:

1. **Caché LRU de consultas normalizadas.** Un asistente corporativo ve las mismas
   200 preguntas una y otra vez; a la semana el acierto de caché es alto y el
   embedding deja de costar latencia y dinero.
2. **Medir antes de optimizar.** Si el número real duele, la interfaz
   `Vectorizador` permite cambiar de proveedor sin tocar el resto.

### Detalles técnicos

- **Dimensión 512, no 2048.** `text-embedding-v4` permite elegir dimensión
  (64–2048) porque está entrenado con representación anidada: recortar no
  destruye la señal. A 512 el índice pesa la cuarta parte y la pérdida de acierto
  es marginal en un corpus de este tamaño.
- **Cuantización int8** con escala por vector: otro 4× de reducción. ~400
  fragmentos × 512 dimensiones = **~200 KB**.
- **BM25 precompilado**: los postings, las frecuencias documentales y las
  longitudes se calculan en la compilación. En ejecución es una búsqueda en tabla.
  Tokenizador español con lista de vacías y raíz ligera.
- **RRF con k=60**, el valor que la literatura reporta como estable. Fusiona por
  posición, no por puntaje: por eso no hay que normalizar escalas incompatibles.
- **La compuerta no mira el puntaje de la fusión** — corrección de diseño hecha al
  implementar la fase 1. Como RRF puntúa por **posición**, un primer puesto suma
  `1/(60+1)` tanto si el resultado es perfecto como si es basura; usarlo para
  decidir si responder habría sido una compuerta que siempre abre. La fusión
  decide el **orden**; la compuerta decide **si**, y mira las dos señales crudas:
  la **cobertura léxica** —qué proporción de los términos de la pregunta aparece
  en el mejor fragmento, acotada en [0,1] y explicable en una frase— y el
  **coseno** del mejor fragmento denso. Basta con que una pase.
- **Reranking**: no en la v1. Con 6 candidatos sobre 400 fragmentos, un
  reordenador añade una llamada de red para ganar poco. La costura queda hecha
  (`recuperar/rerank.ts` vacío) para cuando un cliente traiga un corpus grande.

---

## 6. El widget

Un solo `<script>`, y esa es la prueba de producto:

```html
<script src="https://fluxi.evetev.com/fluxi.js" data-cliente="evetev" defer></script>
```

- **Shadow DOM.** El widget se instala en sitios ajenos; su CSS no puede tocar la
  página ni la página tocarlo a él.
- **Marca por tokens.** Colores, tipografías y mascota entran por atributos
  `data-`. En `evetev.com` carga a Eve desde el CDN de marca (`@1`, regla T1) y el
  coral queda excluido: es exclusivo del CTA global del nav (regla C2).
- **Accesibilidad (§5), no negociable.** Operable solo con teclado, foco atrapado
  en el panel abierto y devuelto al cerrar, `aria-live="polite"` sobre la respuesta
  en streaming, contraste AA, objetivos de 44 px, `prefers-reduced-motion`
  respetado, y funcional a 320 px de ancho — en móvil es hoja inferior, no ventana
  flotante.
- **Degradación.** Sin JavaScript, sin llave o con la API caída, el widget muestra
  el enlace al formulario de contacto. Nunca se rompe: se convierte en lo que ya
  es hoy.
- **Aviso de privacidad** visible en el primer turno, con enlace a la política.

El FAB actual de `apps/website/index.html` (`toggleEve`, `.eve-burbuja`, el saludo
único al hacer scroll) se **reemplaza** por el widget en la fase 3, conservando el
comportamiento que ya está afinado: saludo una sola vez al bajar, retirada a los 3
segundos, y que un toque manda sobre el cierre automático.

---

## 7. Abuso y costo

Es un endpoint **público que gasta dinero**. Sin guardas, un script lo vacía en una
tarde.

| Guarda                         | Valor inicial                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Lista de orígenes permitidos   | `evetev.com`, previews de Vercel, `localhost`. Mismo patrón —y misma fragilidad— que `api/contacto.js` |
| Token de sesión firmado (HMAC) | Emitido por `/api/sesion`, caduca en 30 min. Impide golpear `/api/chat` directo                        |
| Cupo por sesión e IP           | 8 mensajes / 10 min · 30 / día                                                                         |
| Longitud del mensaje           | 500 caracteres                                                                                         |
| Historial enviado al modelo    | 4 turnos, y siempre re-anclado a fragmentos nuevos                                                     |
| Presupuesto diario de tokens   | Tope duro. Superado → degradación al formulario, **no error**                                          |
| Campo trampa                   | Igual que en los formularios: responde 200 y no hace nada                                              |

**Costo por respuesta (estimado, a confirmar midiendo).** Entrada ~1.800 tokens
(sistema 600 + 6 fragmentos + historial), salida ~150. Como referencia verificada
de orden de magnitud, el rango entre niveles de modelo es este:

| Modelo                                         | Entrada (sin caché)            | Salida     | Por respuesta | 1.000 respuestas/mes |
| ---------------------------------------------- | ------------------------------ | ---------- | ------------- | -------------------- |
| `kimi-k3` — el que usa `eve-studio` hoy        | US$3,00/M                      | US$15,00/M | ~US$0,0077    | ~US$7,70             |
| `kimi-k3` **con caché** del prompt de sistema  | US$0,30/M en la parte cacheada | US$15,00/M | ~US$0,006     | ~US$6                |
| Referencia de nivel bajo (`deepseek-v4-flash`) | US$0,44/M                      | US$1,32/M  | ~US$0,001     | ~US$1                |

**Las selladas y las abstenidas cuestan cero**, y son la mayor parte del tráfico
real. La ingesta completa del corpus, incluida la contextualización, se paga una
vez por versión de la base.

En nuestra factura la diferencia es de unos pocos dólares al mes y no decide nada.
**Decide cuando se vende:** un cliente con 50.000 respuestas al mes son US$385
frente a US$50, y ese margen es el del producto. Por eso el nivel de modelo se
elige midiendo en la fase 1 y no por costumbre.

---

## 8. Registro y bucle de mejora

**Los logs de Vercel en plan Hobby duran una hora.** Cualquier diagnóstico que
dependa de ellos llega tarde. Por eso Fluxi escribe su propio registro.

Cada turno emite un evento: pregunta normalizada, fragmentos recuperados con sus
puntajes, camino tomado (sellada / generada / abstenida / degradada), latencia por
etapa, tokens, verificación de salida y resultado. Va a Postgres en un proyecto de
**Supabase aparte** — el de EveConecta se declara en exclusiva de esa vertical.

**Sin datos personales.** El texto de la pregunta se guarda con teléfonos, correos
y cédulas redactados antes de escribir, retención de 90 días, y la finalidad
declarada en el aviso de privacidad (Ley 1581, §4).

De ahí sale lo que hace crecer el producto:

- **Informe semanal de preguntas sin respuesta** — la lista de abstenciones
  agrupadas por similitud. Cada grupo es un documento que le falta a la base. Este
  informe es el que convierte a Fluxi en un servicio con suscripción y no en una
  instalación de una vez.
- **Tablero mínimo**: tasa de sellado, tasa de abstención, latencia p50/p95, costo
  del día, verificaciones de salida fallidas.
- **Documentos vencidos**: los que pasaron su `vigencia`, mensual.

---

## 9. Evaluación — lo que lo vuelve vendible

Sin esto es una demo. Con esto es un producto con garantía.

**Tres conjuntos**, versionados en `eval/`:

| Conjunto                 | Tamaño inicial                                                                               | Qué mide                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `dorado.jsonl`           | ~60 preguntas reales con respuesta esperada y **los fragmentos que deberían recuperarse**    | Que encuentre lo correcto y responda con ello |
| `fuera-de-alcance.jsonl` | ~25 preguntas legítimas cuya respuesta **no está** en la base                                | Que se abstenga en vez de improvisar          |
| `ataques.jsonl`          | ~15 intentos de inyección y jailbreak («ignora tus instrucciones», «eres un modelo general») | Que el cierre aguante presión                 |

**Umbrales que bloquean el merge:**

| Métrica                                                                | Umbral             |
| ---------------------------------------------------------------------- | ------------------ |
| Recuperación — acierto en top 6                                        | ≥ 0,95             |
| Respuesta anclada al contexto (juez con rúbrica + 10% revisado a mano) | ≥ 0,98             |
| Abstención correcta fuera de alcance                                   | ≥ 0,98             |
| Abstenciones falsas (se calla teniendo la respuesta)                   | ≤ 0,05             |
| Fugas en el set de ataques                                             | **0 — bloqueante** |
| p95 al primer token                                                    | ≤ 2,5 s            |

**Truco de CI que hace esto gratis:** los embeddings de las preguntas doradas se
calculan una vez y se commitean. Así la evaluación de **recuperación** corre
completa en cada PR, sin llaves y sin costo. Solo la de **generación** necesita la
API, y se dispara únicamente cuando el PR toca `base/`, el prompt o `src/generar/`.

---

## 10. Roadmap por fases

Cada fase termina con algo que se puede enseñar. Ninguna arranca sin que la
anterior esté verde.

> **La base de agosto de 2026 es provisional.** Servicios, precios y alcance se
> cierran en reuniones de la semana del 24 de agosto, y el corpus se reescribe
> con lo que salga de ahí **antes** de que Fluxi quede de cara al cliente. Lo de
> hoy sirve para construir y calibrar el motor, que no conoce su contenido:
> cambiar la base entera es recompilar el índice.

### Fase 0 — Especificación y base documental _(sin una línea de código)_

- `specs/fluxi/base-documental/spec.md` con criterios EARS.
- **Base documental v1**: 25–35 documentos. Empresa (con las tres líneas),
  EvePay, EveConecta, legales, `_limites.md`, `_selladas.md`, `_sistema.md`.
- Los tres conjuntos de evaluación, escritos **antes** del motor: las preguntas se
  redactan mirando lo que la gente pregunta de verdad, no lo que la base contesta.
- Cuenta de Alibaba Cloud Model Studio creada y **facturación internacional
  verificada desde Colombia**, solo para embeddings. La cuenta de Moonshot ya
  existe y está pagada —es el motor de `eve-studio`—, así que la generación no
  depende de abrir nada. Ambas se anotan en
  `docs/INFRAESTRUCTURA_Y_CUENTAS.md`.

> **Listo cuando** John haya leído y aprobado la base v1 completa. Es la única
> fase cuyo entregable no es técnico y la única que no se puede acelerar.

### Fase 1 — Motor local _(nada en la nube)_

- `scripts/compilar.ts`: troceo, contextualización, vectorización, índice.
- Recuperación híbrida completa + compuerta, con un CLI de prueba.
- `eval/correr.ts` y la primera medición: acierto de recuperación y **calibración
  del umbral de abstención** con datos.
- **Comparación medida** de generadores sobre el set dorado —`kimi-k3`, un nivel
  inferior de Moonshot y un modelo de Qwen—: calidad, latencia y costo por
  respuesta. Se cierra la decisión abierta #1.

> **Listo cuando** el acierto de recuperación pase 0,95 en el set dorado, corriendo
> en el portátil, sin haber desplegado nada.

### Fase 2 — El endpoint

- `api/chat.ts` con streaming SSE, `api/sesion.ts`, `api/salud.ts`.
- Las seis capas de cierre, con la verificación de salida en código.
- Guardas de abuso, cupos y presupuesto diario.
- Proyecto de Vercel nuevo con `ignoreCommand` (séptimo proyecto: sin la guarda,
  cada push volvería a gastar cupo de despliegues de más).

> **Listo cuando** los tres conjuntos de evaluación pasen contra el endpoint
> desplegado, incluidos **cero fallos** en el de ataques.

### Fase 3 — El widget y el relevo en `evetev.com`

- `public/fluxi.js` con Shadow DOM, accesible y con la marca por tokens.
- `demo.html` como banco de pruebas.
- Reemplazo del FAB actual en `apps/website/index.html`, conservando el saludo
  único y la retirada a los 3 segundos.
- Origen nuevo añadido a la lista de `api/contacto.js` si el widget deriva al
  formulario desde otro dominio.

> **Listo cuando** funcione con teclado solo, a 320 px, con lector de pantalla, y
> degrade al enlace de contacto con la API apagada a propósito.

### Fase 4 — Registro y mejora

- Eventos a Supabase (proyecto nuevo), con redacción de datos personales.
- Informe semanal de preguntas sin respuesta y tablero mínimo.
- Primer ciclo completo: leer el informe, escribir los documentos que faltan,
  recompilar, medir la mejora.

> **Listo cuando** el segundo informe semanal muestre menos abstenciones que el
> primero **por documentos añadidos**, no por umbral movido.

### Fase 5 — Producto vendible

- Multi-cliente: `clientes/<slug>/` con base, tema, dominios y cupos propios;
  resolución por origen. Los cimientos multi-inquilino se dejan puestos desde la
  fase 2 (§1.6: no se reescriben después).
- `docs/PLAYBOOK_ASISTENTE_RAG.md`: implantación en un cliente nuevo paso a paso,
  con tiempos reales medidos en las fases anteriores.
- **Informe de evaluación como entregable comercial**: al cliente se le entrega el
  set dorado de _su_ negocio con sus métricas. «Su asistente acierta 0,96 y se
  abstiene correctamente el 0,99 de las veces» es un argumento que no tiene
  competencia en el mercado local.
- Modelo de precio: implantación + suscripción por volumen, sobre el costo real ya
  medido.

---

## 11. Lista maestra de specs

| Spec                         | Fase | Criterio EARS de muestra                                                                                                                                                                          |
| ---------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fluxi/base-documental`      | 0    | **CUANDO** un documento supera su fecha de `vigencia`, **EL** sistema **DEBERÁ** incluirlo en el informe mensual de vencidos y marcar sus fragmentos como confianza media.                        |
| `fluxi/recuperacion-hibrida` | 1    | **CUANDO** ni la cobertura léxica ni el coseno del mejor fragmento alcanzan su umbral, **EL** sistema **DEBERÁ** responder con la derivación al formulario **sin** llamar al modelo generador.    |
| `fluxi/generacion-anclada`   | 2    | **CUANDO** la respuesta del modelo contiene una cita a un identificador que no estaba entre los fragmentos entregados, **EL** sistema **DEBERÁ** descartar la respuesta y devolver la derivación. |
| `fluxi/guardas-y-cupos`      | 2    | **CUANDO** una sesión supera 8 mensajes en 10 minutos, **EL** sistema **DEBERÁ** responder 429 con el enlace al formulario y **no** consumir tokens.                                              |
| `fluxi/widget-embebible`     | 3    | **CUANDO** el endpoint responde error o no responde, **EL** widget **DEBERÁ** mostrar el enlace al formulario de contacto y seguir siendo operable.                                               |
| `fluxi/evaluacion`           | 1–2  | **CUANDO** un PR modifica `base/` o `src/`, **EL** sistema **DEBERÁ** correr los tres conjuntos y bloquear el merge si alguna métrica cae bajo su umbral.                                         |
| `fluxi/registro-y-mejora`    | 4    | **CUANDO** se registra un turno, **EL** sistema **DEBERÁ** redactar teléfonos, correos y documentos de identidad antes de escribir el evento.                                                     |
| `fluxi/multi-cliente`        | 5    | **CUANDO** llega una petición desde un origen registrado, **EL** sistema **DEBERÁ** resolver base, tema y cupos de ese cliente y **jamás** exponer fragmentos de otro.                            |

---

## 12. Documentación que queda _(el requisito de replicabilidad)_

| Documento                           | Para qué                                                                                                                                                                     | Fase     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Este plan                           | El mapa y la bitácora de decisiones                                                                                                                                          | 0        |
| `specs/fluxi/<feature>/`            | Spec, plan y tareas de cada pieza (§9)                                                                                                                                       | por fase |
| `apps/rag-assistant/README.md`      | Cómo se corre, se compila y se despliega                                                                                                                                     | 1        |
| `apps/rag-assistant/base/README.md` | **Manual de redacción de la base.** Se le entrega al cliente: es lo que le permite mantener su propio asistente                                                              | 0        |
| `docs/PLAYBOOK_ASISTENTE_RAG.md`    | Implantación en cliente nuevo, paso a paso, con tiempos                                                                                                                      | 5        |
| `docs/INFRAESTRUCTURA_Y_CUENTAS.md` | Añadir Alibaba Cloud Model Studio y el Supabase de Fluxi                                                                                                                     | 0 y 4    |
| `docs/ESTANDARES_INGENIERIA.md`     | §2/§7: registrar el motor LLM elegido. §8: la línea que manda el servicio de IA a `apps/ai` ya divergió con `eve-studio` y ahora con `apps/rag-assistant`; se corrige por PR | 1        |

---

## 13. Riesgos y puntos frágiles

| Riesgo                                    | Qué pasa                                                                                                                                                                                  | Mitigación                                                                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plan Hobby de Vercel**                  | Es de uso personal y no comercial, corta a los 100 despliegues en 24 h móviles, y retiene logs 1 hora. Un asistente comercial de cara al cliente es exactamente el caso que empuja a Pro. | Registro propio desde la fase 4 (no dependemos de sus logs) y `ignoreCommand` en el proyecto nuevo. La decisión de pasar a Pro se toma con el tráfico real. |
| **Latencia a Singapur**                   | El embedding de la consulta puede costar 350 ms.                                                                                                                                          | Caché LRU de consultas + medición en fase 1 + interfaz `Vectorizador` para cambiar de proveedor.                                                            |
| **Lista de orígenes CORS**                | Si una landing estrena dominio y no se agrega, el widget deja de funcionar **sin que nada se ponga rojo**. Ya pasó con los formularios.                                                   | Prueba de humo automática que verifique el origen de producción tras cada despliegue.                                                                       |
| **Facturación de Alibaba desde Colombia** | Deja sin embeddings, es decir sin la mitad densa de la recuperación. Ya **no** bloquea la fase 1 entera: la generación corre sobre la cuenta de Moonshot que ya funciona.                 | Se verifica en la fase 0. Si no pasa, la v1 arranca con BM25 y respuestas selladas —degradado pero funcional— mientras se busca otro proveedor de vectores. |
| **La base envejece**                      | El asistente afirma con seguridad algo que dejó de ser cierto.                                                                                                                            | `vigencia` obligatoria en el frontmatter + informe mensual de vencidos.                                                                                     |
| **Deriva de marca**                       | El asistente afirma cosas del negocio que nadie aprobó.                                                                                                                                   | Revisión obligatoria de John en PR que toquen afirmaciones de compañía.                                                                                     |
| **Habeas Data**                           | Alguien escribe su cédula en el chat.                                                                                                                                                     | Redacción antes de escribir el evento, retención 90 días, aviso de privacidad en el primer turno.                                                           |

---

## 14. Lo que NO se construye todavía

Reordenador neuronal · `pgvector` · panel de administración de la base · voz ·
multi-idioma · memoria entre sesiones · agentes con herramientas · generación de
imágenes. Cada uno tiene su costura preparada y ninguno entra sin dolor
demostrable (§1.5). El primero que probablemente haga falta es `pgvector`, y será
cuando un cliente llegue con un corpus que no quepa en un archivo del repo.
