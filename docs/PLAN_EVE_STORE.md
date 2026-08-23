# Plan de desarrollo — Eve-Store (comercio electrónico legible por agentes)

> Documento vivo. Se escribe **antes** de construir y se corrige con lo que la
> construcción enseñe, igual que se hizo con Fluxi. La versión final de este
> archivo es la materia prima del manual de implantación que se venderá después,
> así que cada decisión va con su motivo: un manual sin los porqués no se puede
> aplicar a un caso distinto del nuestro.

---

## 0. Qué es Eve-Store y qué no es

**Es** la tienda propia de Evetev y, a la vez, el primer caso del servicio que
vamos a ofrecer: montar comercios electrónicos que un agente de IA pueda leer,
entender y recomendar, sin que la experiencia humana se degrade para lograrlo.

Recupera la línea que salió de la web en el PR #78 —«Tienda: canal de comercio
electrónico propio, hoy operando en Mercado Libre»— y le devuelve su color de
marca, el teal, que sigue sin usarse en ninguna otra vertical.

**No es** un constructor de tiendas ni una alternativa a Shopify. No vendemos
software de tienda: vendemos el montaje de una tienda que funciona en el canal
que los demás todavía no atienden. La diferencia importa para el alcance: no hay
**multi-inquilino**, no hay temas, no hay tiendas de terceros corriendo sobre
nuestra infraestructura. Sí hay panel de administración —uno, el de esta
tienda—; ver §7 bis.

**Por qué la propia primero.** Es el mismo patrón que ya funcionó dos veces:
EveConecta es «nuestro primer cliente» de EvePay, y Fluxi es a la vez producto
y demostración de Eve Intelligence. Una tienda propia que vende de verdad nos
obliga a pagar todos los problemas antes de cobrárselos a nadie.

---

## 1. Decisiones ya cerradas

Estas no se discuten en la spec: vienen de la constitución (§ «Dónde viven las
APIs de una vertical») o del encargo.

| Decisión                                                        | Motivo                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vive en `apps/eve-store/`, vertical completa con backend propio | El dominio de la vertical vive con la vertical. `catalogo`, `carrito` y `pedido` **no** entran a EvePay.                                                                                                                                                             |
| Schema `tienda` en la misma instancia de Postgres               | Barato ahora, y la frontera es real: si mañana necesita base propia, se mueve un schema.                                                                                                                                                                             |
| Sin llaves foráneas entre schemas                               | El pedido guarda `evepay_cobro_id` como texto. Los contextos se enlazan por ID, nunca por referencia de base.                                                                                                                                                        |
| Habla con EvePay **solo por HTTP**                              | Regla dura de la constitución. Estando en el mismo monorepo es tentador importar el módulo de pagos directo, y eso **destruye el dogfooding**: si nuestra vertical no consume la plataforma como un cliente externo, nunca sabremos si sirve para clientes externos. |
| EvePay entra cuando la adquirencia esté habilitada              | Decisión de John. Hasta entonces el cobro vive detrás de una frontera, no cableado. Ver §7.                                                                                                                                                                          |
| Next.js App Router, Supabase, Drizzle                           | Mismo stack que `apps/eveconecta`. Una vertical nueva no estrena tecnología sin una razón que no sea la novedad.                                                                                                                                                     |

El test de la constitución para cualquier duda futura sobre dónde va un
endpoint fue escrito, literalmente, pensando en este caso:

> ¿le entregaría este endpoint tal cual a un ecommerce que compre EvePay?
> Si la respuesta menciona «cuota» o «torre» → es de la vertical.
> Si es «cobro», «comercio», «conciliación» → es del núcleo.

Ahora el ecommerce existe. Si al construirlo aparece un endpoint que EvePay
debería tener y no tiene, ese es el hallazgo más valioso del proyecto y hay que
anotarlo, no rodearlo.

---

## 2. Qué significa «optimizado para IA» en 2026

Aquí es donde el producto se gana el nombre, así que conviene ser exacto y no
repetir lo que dice el sector. Son **tres capas y se ordenan por lo que cuesta
equivocarse en ellas**, no por lo moderno que suene cada una.

### 2.1 Legible — la que casi todos fallan

Ningún rastreador de IA ejecuta JavaScript. Está medido sobre más de 500
millones de peticiones de GPTBot, y vale igual para ClaudeBot, PerplexityBot y
OAI-SearchBot: descargan el archivo JS a veces, no lo ejecutan nunca. **Una
tienda montada como SPA es invisible** para ChatGPT, Perplexity y Claude, por
buena que sea su experiencia de compra.

Esto no es teoría prestada: lo comprobamos en nuestras propias landings en
agosto de 2026 y fue lo único que salió a favor en la auditoría. Que sean HTML
plano las hace legibles enteras.

**Regla dura para Eve-Store:** catálogo, categoría y ficha de producto se
sirven renderizadas desde el servidor. El carrito puede ser estado de cliente
—nadie necesita que un agente vea mi carrito—, pero **ninguna página que deba
ser encontrada depende de hidratación**.

### 2.2 Estructurada — la que decide si te eligen

Los agentes no leen la portada: consultan datos estructurados y comparan. Ante
una consulta en lenguaje natural, gana el producto con la ficha más completa,
no el mejor escrito.

Mínimos por producto, y son mínimos de verdad:

| Campo                  | Detalle que importa                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `name`, `description`  | La descripción, no menos de 150 caracteres. Una línea comercial no compite.                                                 |
| `image`                | Al menos una; varias es mejor.                                                                                              |
| `brand`                | Objeto `Brand` anidado, no una cadena suelta.                                                                               |
| `sku`, `gtin`, `mpn`   | El `gtin` es lo que permite cruzar tu producto con el mismo producto en otro sitio. Sin él, eres un producto sin identidad. |
| `offers.price`         | Cadena numérica `"49900"`. **Nunca** `"$49.900"` ni coma decimal.                                                           |
| `offers.priceCurrency` | ISO 4217: `COP`.                                                                                                            |
| `offers.availability`  | URL de schema.org (`https://schema.org/InStock`), no el texto «disponible».                                                 |

Y una que se equivoca a menudo: **las variantes van como un producto padre con
varios nodos `Offer`**, no como productos sueltos sin relación. Una camiseta en
tres tallas es un producto, no tres.

> Cuidado con la proporción, que ya la medimos en la auditoría de AEO: añadir
> JSON-LD tiene un efecto sobre las citas **indistinguible de cero** en páginas
> de contenido. En comercio es distinto —aquí el esquema **es** el canal de
> datos, no un adorno de parseo—, pero eso vale para `Product`/`Offer`, no
> para llenar la tienda de esquemas por si acaso.

### 2.3 Transaccionable — la capa donde hay que no equivocarse de apuesta

Aquí es donde el sector vende humo y donde este plan se aparta de lo que dirá
cualquier artículo. Los hechos a agosto de 2026:

- Existen **tres protocolos**, en capas distintas: **UCP** (Google/Shopify,
  descubrimiento y carrito), **ACP** (OpenAI/Stripe, ejecución del pago en el
  chat) y **AP2** (iniciado por Google, hoy gobernado por FIDO, prueba de quién
  autorizó el pago).
- **OpenAI retiró Instant Checkout en marzo de 2026.** El protocolo sobrevive;
  el producto de comprar dentro del chat, no. Tras integrarse unos treinta
  comercios de Shopify, OpenAI viró a «ChatGPT Apps» operadas por el propio
  retailer.

**Qué se hace con eso:** no se construye contra ACP todavía. Integrar un
checkout agéntico para un canal que el proveedor acaba de apagar sería gastar
semanas en un cliente que no existe. Lo que sí sobrevive a los tres protocolos,
porque los tres lo consumen, es **un feed de producto exacto y fresco**. Ahí va
el esfuerzo.

La ventana operativa que exige el canal es de **15 minutos como máximo** entre
un cambio de precio o de existencias y su reflejo en el feed. Eso es un
requisito de arquitectura, no de marketing: obliga a que el feed se genere desde
la misma fuente que la ficha, y nunca a mano.

---

## 3. Qué significa «navegable para humanos»

El encargo pide las dos cosas a la vez, y conviene decir por qué no compiten:
**todo lo que hace una tienda legible por un agente la hace más rápida para una
persona.** HTML servido carga antes. Datos estructurados obligan a tener la
ficha completa. Un feed fresco es un inventario que no miente.

Donde sí hay que decidir con criterio humano:

**Búsqueda.** Es la función más usada de cualquier tienda y la peor atendida.
Postgres con diccionario en español y `unaccent` cubre un catálogo pequeño sin
añadir un servicio más que desplegar. Se cambia a otra cosa cuando el catálogo
lo pida, con una medición encima, no antes.

**Ficha de producto.** Precio visible sin desplazar, existencias reales —no
«consultar»—, y el CTA de añadir al carrito como única acción coral de la
vista, según la regla C2 de marca.

**Pago sin fricción** significa cosas concretas y medibles, no una aspiración:
sin registro obligatorio para comprar, sin pedir dos veces el mismo dato, con
el costo total —envío incluido— visible antes del último paso, y con el número
de pasos contado y publicado en este documento cuando exista.

---

## 4. Arquitectura

```
apps/
├── api/                      EvePay — SOLO pagos. No sabe qué es un producto.
│
└── eve-store/                LA VERTICAL
    ├── app/
    │   ├── (tienda)/         catálogo, categoría, ficha  ← servidor, siempre
    │   ├── carrito/          estado de cliente
    │   ├── checkout/         servidor
    │   └── api/              catálogo, carrito, pedidos  ← dominio propio
    ├── server/               casos de uso del dominio tienda
    ├── feed/                 generador del feed de producto
    └── db/                   schema `tienda` (Drizzle)
```

**Fronteras que no se cruzan:** `eve-store` no lee tablas del schema `evepay` ni
importa sus módulos. Cuando necesita cobrar, hace HTTP. Es más lento de escribir
y es el punto entero del ejercicio.

---

## 5. Velocidad, con número

«Carga muy rápido» no es un criterio de aceptación. Los presupuestos, medidos
sobre 4G simulada y con el catálogo real, no con tres productos de prueba:

| Métrica                       | Presupuesto |
| ----------------------------- | ----------- |
| LCP en ficha de producto      | < 2,0 s     |
| TTFB                          | < 400 ms    |
| Peso de la ficha sin imágenes | < 120 KB    |
| JS ejecutado en ficha         | < 80 KB     |

**Regla de la casa aplicada:** ninguno de estos números se da por cumplido
porque el código «debería» cumplirlo. Se mide, y la medición vive en el repo
como cualquier otra prueba. Es la misma regla que gobierna a Fluxi: no hay
requisito sin verificador.

---

## 6. El feed de producto

Una sola fuente —la base— genera tres salidas, y ninguna se escribe a mano:

1. El JSON-LD `Product` + `Offer` embebido en cada ficha.
2. El feed para canales de compra.
3. El `sitemap.xml` de productos.

Si las tres salen del mismo sitio, no pueden contradecirse. Cuando se
contradicen —precio viejo en el feed, precio nuevo en la ficha— el canal deja
de confiar y desaparecer del canal cuesta más que no haber entrado.

---

## 7. El cobro, y por qué hoy no es EvePay

EvePay no está en producción: el núcleo está construido —cobros idempotentes,
libro de movimientos, webhooks, conciliación— pero la habilitación con la
adquirencia sigue en curso y no es un trámite automático. Decisión de John:
**EvePay entra cuando el servicio esté funcional.**

Eso no permite dejar el pago para después. Obliga a lo contrario: el checkout
se construye **desde el primer día contra la interfaz `PaymentProvider`** que
la constitución ya nombra como costura de crecimiento. Hoy detrás hay un
proveedor provisional; el día de la habilitación se cambia la implementación y
no se toca el flujo.

**Lo que queda por decidir y no decido yo:** qué hace la tienda mientras tanto
—cobrar por otro medio, o abrir solo con pedidos confirmados fuera de línea—.
Es una decisión comercial, no técnica.

---

## 7 bis. El panel de administración

Encargo de John, y cambia una decisión que este plan daba por hecha.

**El catálogo deja de vivir en un archivo.** Hoy es `catalogo.json`, que
regenera un script de Python. Eso sirvió para importar, y no sirve para que una
persona edite: un panel que escriba en un JSON versionado en git es un panel que
no se puede usar sin hacer commit. La fuente de verdad pasa a ser el schema
`tienda` en Postgres, y `catalogo.json` queda como **artefacto de importación**,
no como fuente. Es una puerta de un solo sentido y conviene atravesarla ahora,
antes de que haya pedidos.

**Su primera pantalla no es «agregar producto».** El catálogo ya está importado;
lo que no está es revisado. Los 25 productos llegaron de Mercado Libre con 45
avisos —descripciones sin confirmar, contenido ausente, GTIN en conflicto,
afirmaciones terapéuticas retiradas— y **ninguno debería salir a la tienda sin
que alguien los mire**. La pantalla de inicio del panel es esa cola de trabajo.
Agregar productos importa después: es lo que se usa una vez al mes, no lo que
desbloquea la apertura.

**La regla de publicación vive en la base, no en la aplicación.** Un producto
con avisos bloqueantes sin resolver no se puede marcar como publicado; lo impide
un disparador de Postgres. Se hace ahí a propósito, por la misma disciplina que
gobierna a Fluxi: ningún requisito se da por cumplido porque el código «debería»
cumplirlo. Un import, un script de migración o un panel futuro pueden saltarse
una validación de aplicación; no pueden saltarse un disparador.

**Las estadísticas que sí tienen dato hoy** —y no las que suenan bien—: unidades
por producto y valor del inventario ($9.455.200 COP), productos publicados
frente a bloqueados, avisos pendientes por tipo, y el histórico de ventas de
Mercado Libre que viaja en `origen_publicacion`. Las de conversión y carrito
abandonado no existen hasta que haya tráfico y pedidos; inventarlas en el panel
sería decorar.

**El dinero se guarda como EvePay lo guarda:** entero en la unidad mínima. Para
COP la unidad mínima es el valor face —$52.000 se guarda como `52000`—, tal como
dice el comentario de `montoMinor` en la API. Si la tienda guardara pesos×100,
cada pedido enviado a EvePay valdría cien veces más. Es exactamente el tipo de
frontera que la regla de hablar por HTTP obliga a mirar.

---

## 8. Lo que hoy bloquea, dicho claro

1. ~~No sé qué vende Eve-Store.~~ **Resuelto.** 25 productos importados desde el
   reporte de Mercado Libre y el inventario físico, con descripciones escritas y
   pendientes de confirmar. Quedan dos decisiones que solo tiene la compañía: el
   reparto de las cinco unidades del serum con vitamina C entre Botanikalia y
   Dermanat, y el contenido de nueve productos que no lo declaran.
2. **EvePay no cobra todavía** (§7).
3. **Vercel Hobby.** Una app más es un proyecto más, y el límite de 100
   despliegues por 24 h ya nos frenó dos veces esta semana. Conviene contarlo
   antes de que sorprenda.

---

## 9. Roadmap por fases

| Fase            | Qué entrega                                                                                              | Depende de                  |
| --------------- | -------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1 · Catálogo    | Modelo de datos, carga del catálogo real, ficha y categoría servidas desde el servidor, JSON-LD completo | El catálogo (§8.1)          |
| 2 · Encontrable | Búsqueda en español, feed de producto, sitemap, presupuestos de velocidad medidos                        | Fase 1                      |
| 3 · Comprable   | Carrito, checkout contra `PaymentProvider`, pedido                                                       | Decisión comercial de §7    |
| 4 · Cobrable    | EvePay conectado por HTTP, conciliación                                                                  | Habilitación de adquirencia |
| 5 · Vendible    | Manual de implantación, precios del servicio                                                             | Fases 1-4                   |

Las fases 1 y 2 no dependen de EvePay. Se puede llegar a una tienda completa y
encontrable antes de que la pasarela exista.

---

## 10. Lista maestra de specs

En `specs/eve-store/`, con criterios de aceptación en EARS (§9 de la
constitución):

- `catalogo-y-ficha` — modelo, renderizado en servidor, JSON-LD
- `panel-de-administracion` — cola de avisos, edición, alta, estadísticas
- `busqueda-en-espanol` — tsvector, unaccent, sinónimos
- `feed-de-producto` — generación desde la fuente única, ventana de 15 min
- `carrito-y-checkout` — pasos contados, sin registro obligatorio
- `cobro-via-evepay` — la frontera `PaymentProvider` y su implementación

---

## 11. Documentación que queda _(el requisito de replicabilidad)_

Encargo explícito de John: la construcción se documenta **mientras ocurre**, no
al final, para poder ofrecer el montaje como servicio. Lo que hay que ir
escribiendo:

- **Este plan**, corregido con lo que la construcción enseñe. Un plan que sale
  intacto de la obra es que nadie lo consultó.
- **`docs/PLAYBOOK_ECOMMERCE_IA.md`** — el manual de implantación, con la
  estructura que ya funcionó en el de RAG: qué se vende con precisión, el
  proceso fase por fase, la configuración recomendada, **las trampas ya
  pagadas** y los requerimientos mínimos.
- **`docs/MODELO_DE_NEGOCIO_ECOMMERCE.md`** — economía unitaria medida, no
  estimada, y el precio del servicio separado de los costos recurrentes que
  paga el cliente.

La sección de trampas es la que da valor comercial al manual: cualquiera puede
describir el camino feliz. Lo que se cobra es no repetir los errores. La
primera entrada ya está: **no construir contra ACP en 2026** (§2.3).

---

## 12. Riesgos

- **Apostar por el canal equivocado.** Es el riesgo principal y ya se materializó
  una vez este mes: Instant Checkout parecía la integración obvia y llevaba
  cinco meses apagada. Mitigación: invertir en el feed, que los tres protocolos
  consumen, y no en un cliente concreto.
- **Que la tienda propia no venda nada.** Una demostración sin transacciones
  reales no prueba el servicio. Mejor un catálogo pequeño que venda a uno grande
  que decore.
- **Que el catálogo se mantenga en dos sitios.** Si Mercado Libre y Eve-Store
  divergen, el feed miente. Hay que decidir cuál manda antes de la fase 2.

---

## 13. Lo que NO se construye todavía

Panel para **terceros** —el nuestro sí se construye, §7 bis— · temas ·
multi-tienda · integración ACP o UCP · aplicación móvil · recomendador ·
reseñas · programa de puntos.

Aparecen cuando un cliente los pida y pague, no antes. La misma disciplina que
mantuvo a EvePay en `pagos` y evitó que se llenara de cuotas y residentes.
