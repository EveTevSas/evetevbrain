# @evetev/rag-assistant

**Fluxi** — el motor del asistente de IA que responde **solo** con lo que hay en
su base documental. En `evetev.com` se presenta como **Eve**, la mascota; Fluxi es
el nombre del motor, que es lo que se vende en marca blanca a otras empresas.

> El plan completo: [`docs/PLAN_ASISTENTE_FLUXI.md`](../../docs/PLAN_ASISTENTE_FLUXI.md).
> Specs: [`specs/fluxi/`](../../specs/fluxi/).

## ⚠️ La base documental de hoy es provisional

El corpus actual se extrajo de las páginas públicas en agosto de 2026 y **va a
reescribirse** cuando se cierren servicios, precios y alcance. Sirve para
construir y calibrar el motor; **no es la base con la que Fluxi saldrá de cara al
cliente**. Cambiarla entera es recompilar el índice, nada más — el motor no
conoce su contenido.

## En qué punto va

| Fase                | Estado                          |
| ------------------- | ------------------------------- |
| 0 — base documental | hecha (provisional)             |
| 1 — motor local     | **hecha, salvo la mitad densa** |
| 2 — endpoint        | por hacer                       |
| 3 — widget          | por hacer                       |

```
apps/rag-assistant/
├── base/                  # la base documental — fuente de verdad, en git
│   ├── _sistema.md · _limites.md · _selladas.md · _reglas.json
│   ├── README.md          # manual de redacción — el que se le entrega al cliente
│   └── empresa/ (8) · evepay/ (13) · eveconecta/ (9) · legales/ (3)
├── indice/indice.json     # compilado y COMMITEADO: es un archivo, no un artefacto
├── src/
│   ├── normalizar.ts      # sinTildes — lo comparten tres capas
│   ├── base/              # reglas · lectura · validación · troceo · frases
│   ├── recuperar/         # texto · bm25 · rrf · compuerta
│   ├── indice/            # tipos y huella del corpus
│   ├── selladas.ts · limites.ts
│   └── responder.ts       # los cuatro caminos de una respuesta
└── scripts/               # compilar · preguntar
```

## Los cuatro caminos

Una consulta sale por uno de cuatro, y **dos no llegan al modelo**:

| Camino         | Coste     | Cuándo                                                |
| -------------- | --------- | ----------------------------------------------------- |
| **Sellada**    | 0 tokens  | coincide con una pregunta frecuente de `_selladas.md` |
| **Límite**     | 0 tokens  | toca un tema vetado de `_limites.md`                  |
| **Abstención** | 0 tokens  | ninguna señal de recuperación llega al umbral         |
| **Generar**    | 1 llamada | hay material; se entregan hasta 6 fragmentos          |

## Correr en local

```bash
pnpm --filter @evetev/rag-assistant compilar
pnpm --filter @evetev/rag-assistant preguntar "¿cómo cobran?"
```

`compilar` valida el corpus, lo trocea y escribe `indice/indice.json`. Falla
ruidosamente si algún documento rompe una de las reglas de `base/_reglas.json`, y
con `--comprobar` verifica que el índice corresponde a la base sin reescribirlo
(es lo que correrá en CI).

`preguntar` **sin `MOONSHOT_API_KEY`** muestra qué camino tomó la consulta y qué
fragmentos se entregarían — así se calibra la compuerta sin gastar un token. Con
llave, responde de verdad:

```
> que pasa si mi cliente paga dos veces
[GENERADA] kimi-k2.6 · 3119 ms · 1369 entrada (512 en cache) · 73 salida

Si tu cliente paga dos veces, el sistema no lo cobra dos veces. Cada cobro lleva
una clave de idempotencia y una máquina de estados explícita, así que el reintento
devuelve el cobro que ya existía. [#evepay-capacidades#1]
```

`comparar` mide modelos sobre las mismas preguntas y `senal` compara las señales
de la compuerta dentro y fuera del alcance. Los dos existen porque estas
decisiones **se miden**, no se heredan.

## El modelo se eligió midiendo

| Modelo      | Generadas | Descartadas | Latencia media | Entrada (cacheada) | Salida  |
| ----------- | --------- | ----------- | -------------- | ------------------ | ------- |
| `kimi-k3`   | 5         | 0           | 4.963 ms       | 1.495 (1.331)      | 138     |
| `kimi-k2.6` | 5         | 0           | **3.461 ms**   | 1.409 (1.277)      | **110** |

Calidad equivalente, `kimi-k2.6` un 30% más rápido y con menos salida — y
`kimi-k3` cuesta US$3,00/M de entrada y US$15,00/M de salida. **Se usa
`kimi-k2.6`.**

Tres cosas que solo se supieron llamando al modelo de verdad:

- **`kimi-k2.6` no admite `temperature`** distinta de 1: responde 400. El
  parámetro pasó a ser opcional. Que esto no rompiera nada es la prueba de que el
  anclaje está donde debe: la compuerta decide si se llama, la verificación
  decide si se muestra. La temperatura nunca fue la guarda.
- **Los modelos razonan antes de responder y ese razonamiento gasta el
  presupuesto de salida.** La primera llamada real devolvió **texto vacío**
  habiéndose comido los 220 tokens. Se apaga.
- **La guarda de enlaces tumbaba respuestas correctas.** El prompt manda ofrecer
  `contacto@evetev.com`, el modelo obedecía, y como no estaba en los fragmentos
  se marcaba como inventado. El conjunto válido es contexto **∪ prompt**.

Y con el servidor local se prueba el widget de verdad, con el mismo núcleo que
corre en Vercel:

```bash
pnpm --filter @evetev/rag-assistant servir   # http://localhost:3005
```

## Desplegado

Proyecto de Vercel **`rag-assistant`**, creado el 19 de agosto de 2026 apuntando a
este mismo repositorio:

| Ajuste           | Valor                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Root Directory   | `apps/rag-assistant`                                                                               |
| Framework Preset | Other (lo fija `vercel.json` con `framework: null`)                                                |
| Producción       | `rag-assistant-ochre.vercel.app` — Vercel añadió el sufijo porque `rag-assistant` ya estaba tomado |
| Dominio          | `fluxi.evetev.com` — **añadido pero sin resolver todavía**                                         |

Comprobado en producción: `/demo.html`, `/fluxi.js`, `/api/salud`, la emisión de
sesión, una respuesta sellada transmitida entera y un `403` desde un origen ajeno.

### Lo que falta, y por qué no lo hizo el agente

- **El registro DNS.** En name.com hay que crear `CNAME` con nombre `fluxi` y
  valor `5202b8778fa8f959.vercel-dns-017.com.` Ese panel entra por
  email/contraseña, y **las contraseñas no las escribe el agente**.
- **Las dos llaves.** En _Settings → Environment Variables_ del proyecto:
  `MOONSHOT_API_KEY` y `FLUXI_SECRETO` (`openssl rand -hex 32`). Tampoco las
  escribe el agente: son secretos.
  `FLUXI_ORIGENES` sí quedó puesta —no es un secreto— con
  `https://evetev.com,https://www.evetev.com,https://fluxi.evetev.com`.

**Mientras falte `MOONSHOT_API_KEY` el asistente ya funciona degradado**, y eso no
es un accidente: responde las preguntas selladas y los temas vetados, y deriva en
todo lo demás. Está comprobado contra el despliegue real.

## El widget

Se instala con una línea:

```html
<script src="https://fluxi.evetev.com/fluxi.js" data-nombre="Eve" defer></script>
```

Vive en un **Shadow DOM**: se instala en sitios ajenos, así que su CSS no puede
tocar la página ni la página tocarlo a él. Sin JavaScript, sin llave o con la API
caída, muestra el enlace de contacto — que es lo que el muñeco de la esquina hacía
antes. **Nunca se rompe: se convierte en lo que ya era.**

Los identificadores `[#id]` no se muestran: son para verificar. Debajo de la
respuesta sale una línea discreta con el nombre de los documentos que la
sustentan.

## Transmitir sin poder desdecirse

El endpoint no emite token a token, y no es un capricho: **lo que ya se mostró no
se puede desdecir**. Si se transmite en crudo y la verificación falla al final, la
respuesta mala ya la vio la persona.

Se transmite **por frases ya verificadas**: se acumula, se corta en frases
completas —con sus citas, que van _después_ del punto— y cada una se comprueba
antes de emitirse. El primer texto aparece al cabo de una frase en vez de al cabo
de la respuesta entera, y nada sin verificar llega nunca a la pantalla.

Calidad:

```bash
pnpm --filter @evetev/rag-assistant lint
pnpm --filter @evetev/rag-assistant typecheck
pnpm --filter @evetev/rag-assistant test
```

## Lo que falta, y por qué

- **La mitad densa de la recuperación.** El código de fusión ya la contempla, pero
  no hay vectores: hace falta la cuenta del proveedor de embeddings. **Se nota**,
  y está medido: «¿ustedes se quedan con mi plata?» hoy **se abstiene**, porque
  BM25 no puede saltar de «quedan/plata» a «dinero/tesorería». Hay un test que lo
  fija; el día que entren los vectores ese test va a fallar y habrá que cambiarlo
  a «generar». Es el hueco que el híbrido existe para cerrar.
- **La contextualización** de fragmentos en la ingesta. Necesita modelo.
- **El proyecto de Vercel** y el dominio `fluxi.evetev.com`. No se pudo hoy: la
  cuenta llegó al tope de despliegues del plan Hobby.
- **El relevo del FAB en `apps/website`**, que va _después_ del punto anterior:
  hasta que el endpoint tenga dominio, el widget solo mostraría el enlace de
  contacto, que es peor que la burbuja de hoy.
- **El registro de eventos y el cupo duradero.** El contador de hoy vive en
  memoria del proceso: en Vercel hay varias instancias y son efímeras, así que es
  un badén, no una barrera.
- **La calibración de los umbrales.** El de cobertura (0,30) sale de medir 13
  preguntas con `senal`: fuera de alcance no pasa de 0,18 y el peor caso legítimo
  da 0,36. Es un hueco con margen, **pero no es una calibración** — son 13
  puntos. El del coseno (0,55) sigue sin medir porque no hay vectores.
