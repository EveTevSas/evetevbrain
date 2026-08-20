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

`preguntar` **todavía no llama al modelo**: muestra qué camino tomó la consulta y,
cuando toca generar, qué fragmentos se le entregarían. Es lo que permite calibrar
la compuerta sin gastar un token.

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
- **La generación.** El motor prepara los fragmentos; llamar al modelo es la
  fase 2, junto con la verificación de citas y de cifras.
- **La contextualización** de fragmentos en la ingesta. Necesita modelo.
- **La calibración de los umbrales.** Los de hoy (0,5 de cobertura, 0,55 de
  coseno) son una conjetura razonada, no un número medido, y así está dicho en el
  código. Se calibran con el set dorado cuando exista la base definitiva.
