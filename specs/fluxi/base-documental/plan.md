# Plan — Base documental de Fluxi

## Dónde vive

```
apps/rag-assistant/base/
├── _sistema.md          # prompt de anclaje       ─┐
├── _limites.md          # temas vetados + respuesta │ configuración: se compilan aparte,
├── _selladas.md         # preguntas con respuesta   │ no se indexan como documentos
│                                                   ─┘
├── empresa/    (8)      # identidad · líneas · misión · principios · estado · contacto · equipo · cómo trabajamos
├── evepay/    (12)      # qué es · estado · gateway puro · seguridad · capacidades · API · link de pago · para quién · tarifas · métodos · reportes · piloto
├── eveconecta/ (9)      # qué es · recaudo · dashboard · residentes · gobierno · visibilidad · tarifas · cómo empieza · puente con EvePay
└── legales/    (3)      # datos personales · privacidad del chat · permanencia
```

## Frontmatter (contrato)

```yaml
id: evepay-que-es # único en todo el corpus; es lo que el modelo cita
titulo: Qué es EvePay
producto: evepay # empresa · evepay · eveconecta · legales
audiencia: comercio # general · comercio · residente · desarrollador · candidato
vigencia: 2026-12-31
fuente: sitio-web # sitio-web · manual-de-marca · constitucion · decision-john-<fecha>
confianza: alta # alta · media
```

`id` es la pieza crítica: la capa 4 del cierre comprueba que toda cita del modelo
corresponda a un `id` que estaba entre los fragmentos entregados. Un `id`
duplicado rompería esa verificación en silencio, así que la unicidad se valida en
la compilación y no se confía a la disciplina.

## El validador (`src/ingesta/validar.ts`)

Corre antes de trocear. Es el que convierte las reglas de contenido en código:

| Comprobación                                                  | Falla con        |
| ------------------------------------------------------------- | ---------------- |
| Los siete campos presentes y con valor del conjunto permitido | archivo + campo  |
| `id` único en el corpus                                       | los dos archivos |
| Frases vetadas (`FRASES_VETADAS`)                             | frase + línea    |
| Nombres de competidores fuera de `legales/`                   | nombre + línea   |
| Cifra de tarifa sin la palabra «referencia» ni derivación     | archivo + línea  |
| Afirmación de disponibilidad de EvePay                        | archivo + línea  |
| Promesa de fecha (`estará listo en`, mes + año)               | frase + línea    |

Las listas viven en `base/_reglas.json`, no en el código: un cliente nuevo trae
sus propias frases prohibidas sin tocar el motor. Es la misma idea que la lista
blanca `CAMPOS` de `api/contacto.js` — una sola lista, no dos paralelas que
puedan desalinearse.

## Troceo y contextualización

1. Se parte por encabezado `##`. Una sección de más de 350 tokens se parte por
   párrafo con una frase de solape.
2. Cada fragmento recibe **dos o tres líneas de contexto** generadas en la
   ingesta, que lo sitúan en su documento. Se generan una vez y se guardan en el
   índice: no se recalculan en cada compilación si el texto del fragmento no
   cambió (huella SHA-256 por fragmento).
3. Se vectoriza el texto **contextualizado**, no el crudo.
4. El frontmatter viaja con el fragmento como metadatos filtrables.

## Sincronía base ↔ índice

`indice/` se commitea. La CI recalcula la huella del corpus y la compara con la
que el índice declara; si no cuadran, falla. Sin esa comprobación, un PR podría
cambiar la base y dejar en producción el índice viejo — el asistente respondería
con la versión anterior del documento sin que nada se ponga rojo, que es
exactamente el modo de fallo silencioso que ya conocemos de la lista de orígenes
de los formularios.

## Marcado de PR que requiere revisión

Un job de la CI mira el diff: si toca `base/empresa/`, `base/legales/`, o
cualquier archivo cuyo contenido cambie una cifra, añade la etiqueta
`revisión-de-contenido` y lo comenta en el PR. No bloquea por sí solo — lo hace
visible, que es lo que faltó cuando un cambio de maquetación se llevó por delante
una afirmación sobre el negocio.

## Restricciones

- Material **público** únicamente. Nada de la constitución, proveedores,
  arquitectura interna ni cifras de negocio entra al corpus.
- El corpus v1 no nombra adquirente ni proveedor de tokenización: las fuentes se
  contradicen (ver _Hallazgos_ en la spec) y no se inventa la síntesis.
- Español de Colombia, una sola versión. Sin traducción en v1.
