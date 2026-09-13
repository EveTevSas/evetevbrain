# Eve-Orígenes

Submarca editorial y de tienda de Evetev: el portal de cuidado de la piel y vida
saludable con productos de fabricación colombiana, y la tienda que los vende.

**Fuente:** «Manual de Identidad Corporativa · SkinCare Orígenes» (2020). El
único cambio decidido es el nombre: **SkinCare Orígenes pasa a ser
Eve-Orígenes**. Todo lo demás sale del manual, con las correcciones de abajo.

Eve-Orígenes es **una marca de Evetev S.A.S.** y así se dice en el pie de cada
página. No sustituye la marca corporativa (`../assets/`): convive con ella.

## Logotipo

| Archivo                                              | Uso                                                |
| ---------------------------------------------------- | -------------------------------------------------- |
| `logotipo-oliva.svg`                                 | Cabecera, sobre fondo claro                        |
| `logotipo-blanco.svg`                                | Sobre oliva o petróleo (pie, bandas)               |
| `hoja-oliva.svg` · `hoja-blanca.svg`                 | La hoja sola, cuando no cabe el nombre             |
| `hoja-circulo-oliva.svg` · `hoja-circulo-blanca.svg` | La hoja en círculo, la que el manual pone como «O» |
| `favicon/`                                           | La hoja en círculo en 32, 180 y 512 px, y en SVG   |

**Los trazos no están redibujados.** La hoja y la hoja en círculo se extrajeron
como vectores del PDF del manual, curva por curva. El nombre «Eve-Orígenes» está
compuesto en El Messiri Regular —la tipografía de títulos del manual— con los
glifos convertidos a trazados, para que el logotipo no dependa de tener la
fuente cargada.

## Color

Se usan **los colores que se ven en el manual, no los códigos que escribe**.
Decisión del 12-sep-2026, tras detectar cinco muestras donde no coinciden:

| Muestra      | Se usa    | El manual escribe | Por qué no coincide                      |
| ------------ | --------- | ----------------- | ---------------------------------------- |
| Principal 3  | `#2ca089` | `#58595b`         | Etiqueta copiada de otra muestra         |
| Principal 4  | `#cbcead` | `#babd92`         | Muestra al 75 % de opacidad sobre blanco |
| Principal 5  | `#a5b3b3` | `#395858`         | Muestra al 46 % de opacidad              |
| Principal 6  | `#f5f5f5` | `#e0e0e0`         | Muestra al 32 % de opacidad              |
| Secundario 4 | `#84898c` | `#58595b`         | Etiqueta copiada de otra muestra         |

Paleta completa y roles en `colores.css`.

### Qué color va con qué

Medido con la fórmula de contraste de WCAG. AA pide 4,5:1 para texto normal y
3:1 para texto grande (≥ 24 px, o ≥ 18,7 px en negrita).

| Combinación                      | Contraste | Sirve para                         |
| -------------------------------- | --------- | ---------------------------------- |
| Blanco sobre petróleo `#255958`  | 7,9:1     | **Botón de compra** (acción)       |
| Blanco sobre oliva `#565d47`     | 6,9:1     | Pie, bandas de peso, botones 2.º   |
| Oliva sobre niebla `#f5f5f5`     | 6,3:1     | Títulos y texto secundario         |
| Petróleo sobre niebla            | 7,3:1     | Enlaces, antetítulos               |
| Arena `#f2d6ae` sobre oliva      | 4,9:1     | Acento claro sobre fondo oscuro    |
| Petróleo sobre arena             | 5,7:1     | Texto en bandas arena              |
| Petróleo sobre salvia `#cbcead`  | 4,9:1     | Texto en bandas salvia             |
| Petróleo sobre durazno `#f5b895` | 4,6:1     | Etiquetas cálidas                  |
| Jade `#2ca089` sobre blanco      | 3,2:1     | **Solo** texto grande o decoración |
| Gris `#84898c` sobre blanco      | 3,5:1     | **Solo** texto grande o bordes     |

**Lo que no se hace, aunque el manual lo muestre:** texto blanco sobre arena. El
ejemplo tipográfico del manual («Salud y belleza») lo usa y da **1,4:1**:
prácticamente ilegible. Sobre arena, el texto va en petróleo u oliva.

Los colores de estado —alerta y error— no son de marca y no salen del manual:
son funcionales y se mantienen para que un error nunca se confunda con un
acento.

## Tipografía

El manual usa dos fuentes que **no son de libre uso en web**. Se sustituyen por
las más parecidas con licencia libre (SIL Open Font License, en Google Fonts),
elegidas comparándolas contra el propio PDF:

| Rol                | Manual         | Se usa            | Por qué esta                                  |
| ------------------ | -------------- | ----------------- | --------------------------------------------- |
| Títulos            | El Messiri     | **El Messiri**    | Ya es libre                                   |
| Subtítulos y texto | Century Gothic | **Didact Gothic** | La más cercana en peso, con la «a» de un piso |
| Anuncios y acentos | Jenna Sue      | **Caveat**        | Casi las mismas letras manuscritas            |

- **Century Gothic** es de Monotype y su licencia web es de pago.
- **Jenna Sue** es gratuita en escritorio, pero la licencia webfont cuesta $10.

Caveat es para acentos breves («Ver contenido»), **nunca** para el texto de un
botón de compra ni para párrafos: una manuscrita se lee peor, y en el botón que
convierte eso cuesta ventas.
