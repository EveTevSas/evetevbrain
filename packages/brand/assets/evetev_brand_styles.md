# evetev_brand_styles.md — Especificación de marca para agentes de IA

> **Instrucción para el agente:** este documento es la fuente de verdad de la identidad visual de **Evetev S.A.S.**
> Al generar cualquier artefacto (página web, componente, presentación, correo, documento, mockup), aplica estas
> reglas **literalmente**. Si una petición del usuario contradice una regla marcada como PROHIBIDO, cumple la regla
> y avisa al usuario en una línea. Si un dato no está aquí, elige la opción más cercana al espíritu descrito en §1
> y decláralo como suposición al final de tu respuesta.
>
> **Versión:** 1.0 · Basado en el Manual de imagen corporativa v2.0 y el sitio de referencia `evetev_sitio_v3.html`.

---

## 1. Identidad en una frase

Evetev construye tecnología financiera e inteligencia artificial confiables. Todo artefacto debe transmitir,
en este orden: **confianza** (infraestructura de pagos) → **inteligencia** (casa de IA) → **claridad**
(tarifas transparentes, cero letra menuda) → **cercanía** (calidez redondeada, toque alegre del coral).

**Personalidad visual:** minimalista elegante. Casi todo claro, líneas finas, mucho espacio en blanco,
jerarquía por espacio y no por adornos. Un solo llamado a la acción por pantalla.
Referencias del sector: Anthropic y Apple en sobriedad; nunca recargado ni "corporativo genérico".

**Producto y líneas de negocio:**

- **EvePay** — plataforma/pasarela de pagos (el producto principal). Identificador: azul eléctrico.
- **Eve Intelligence** — soluciones de IA (RAG, asistentes). Identificador: violeta.
- **Tienda** — comercio electrónico. Identificador: teal.
- **Eve** — la mascota (gato-robot azul). Es el rostro del asistente digital.

---

## 2. Tokens de color (valores exactos, no aproximar)

```css
:root {
  /* Base */
  --eve-azul-noche: #0a2540; /* texto principal, fondos de peso, footer */
  --eve-azul-noche-profundo: #081d33; /* fondo de modo oscuro (NUNCA negro puro) */
  --eve-hielo: #eaf2fb; /* superficies claras, tarjetas */
  --eve-tinte: #f4f9fd; /* secciones alternas suaves */
  --eve-linea: #edf3fa; /* bordes y divisores */
  --eve-pizarra: #64748b; /* texto secundario */
  --eve-muted: #94a3b8; /* metadatos, placeholders */
  --eve-blanco: #fdfeff; /* fondo de página */

  /* Acción */
  --eve-coral: #ee3d22; /* CTA primario — EXCLUSIVO */
  --eve-coral-hover: #cf3016;

  /* Azules funcionales */
  --eve-electrico: #1e6feb; /* enlaces, anillo de foco */
  --eve-mezclado: #144a96; /* secundario: botones 2os, sliders, switches, gráficos */
  --eve-cian: #22d3ee; /* realce sobre fondos oscuros */
  --eve-teal: #3baec2; /* ilustración, línea Tienda */

  /* Violeta Eve — línea Eve Intelligence */
  --eve-violeta: #8b5cf6;
  --eve-violeta-texto: #6d28d9;
  --eve-violeta-tinte: #ede9fe;

  /* Semánticos */
  --eve-exito: #16a34a;
  --eve-alerta: #d97706;
  --eve-error: #b91c1c;
}
```

**Atajo:** puedes importar los tokens en vez de copiarlos:

```html
<link rel="stylesheet" href="/marca/colores.css" />
```

### Reglas de color (obligatorias)

| #   | Regla                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **Proporción 60/20/10/5/5**: 60% superficies claras · 20% azul noche · 10% azules funcionales · 5% coral · 5% cian/teal/violeta.                                              |
| C2  | **El coral es exclusivo de acciones.** Máximo **un botón coral por pantalla/vista**. PROHIBIDO usar coral en fondos grandes, textos largos, bordes decorativos o iconografía. |
| C3  | **El violeta nunca va en botones.** Solo identifica Eve Intelligence: iconos, chips, ilustración, degradado IA.                                                               |
| C4  | **Modo oscuro sobre `#081D33`**, jamás negro puro (`#000`).                                                                                                                   |
| C5  | **Errores siempre con ícono + texto**, nunca comunicados solo por color (el coral de acción y el rojo de error deben distinguirse).                                           |
| C6  | **Degradados solo en piezas expresivas** (hero, portadas, isotipo). PROHIBIDO en botones, texto o componentes funcionales.                                                    |
| C7  | Cian y violeta base **nunca como texto sobre fondo blanco** (contraste insuficiente). Usa `--eve-violeta-texto` o azul noche.                                                 |

### Degradados

```css
--eve-grad-corporativo: linear-gradient(90deg, #0a2540 0%, #1e6feb 55%, #22d3ee 100%);
--eve-grad-ia: linear-gradient(90deg, #8b5cf6 0%, #6366f1 50%, #22d3ee 100%);
```

---

## 3. Tipografía

```html
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600&display=swap"
/>
```

| Familia            | Rol               | Pesos         | Dónde                                                          |
| ------------------ | ----------------- | ------------- | -------------------------------------------------------------- |
| **Baloo 2**        | Marca y titulares | 600, 700      | Logotipo, `h1`–`h2`, cifras protagonistas (montos, métricas)   |
| **Inter**          | Producto y cuerpo | 400, 500, 600 | Toda la UI: párrafos, botones, formularios, tablas, navegación |
| **JetBrains Mono** | Técnico           | 400, 500      | Código, referencias de transacción, documentación de API       |

```css
h1,
h2,
.brand {
  font-family: "Baloo 2", sans-serif;
  font-weight: 600;
}
body {
  font-family: "Inter", sans-serif;
  line-height: 1.65;
  color: #0a2540;
}
```

**Escala fluida (usar `clamp` siempre):**

```css
h1 {
  font-size: clamp(1.9rem, 4.6vw, 2.6rem);
  line-height: 1.16;
}
h2 {
  font-size: clamp(1.3rem, 2.6vw, 1.6rem);
}
p {
  font-size: clamp(0.9rem, 1.6vw, 0.98rem);
}
small {
  font-size: 0.82rem;
}
```

Nunca menos de 12 px. Máximo dos familias visibles por pieza (la mono solo en contexto técnico).

---

## 4. Activos de marca (NO generar logos a mano)

**REGLA T1 — PROHIBIDO dibujar, recrear o aproximar el logo de Evetev.** Siempre
referenciar el archivo, nunca reproducirlo.

> **Dónde están.** La fuente es `packages/brand/assets/` en el monorepo, y cada
> app los sirve desde su propio origen en `/marca/<archivo>`. La carpeta la
> llena `pnpm marca:sync` desde un manifiesto (`scripts/marca-sync.mjs`), y el
> CI comprueba que no se desvíe. Si el activo que necesitas no está en `/marca`,
> se añade una línea al manifiesto; no se enlaza desde fuera.
>
> Hasta agosto de 2026 esto se servía por jsDelivr desde el repositorio
> `Evetev-Dev/brand`. Ese repositorio se borró: **cualquier URL de
> `cdn.jsdelivr.net/gh/Evetev-Dev/brand` que encuentres está muerta.**

**REGLA T2 — La variante se elige por el fondo, no por gusto.** El criterio es
el contraste, y es obligatorio:

| Fondo                                                     | Isotipo                                 | Unidad                              | Por qué                                                                                               |
| --------------------------------------------------------- | --------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Claro (blanco, hielo, tinte)                              | `isotipo-azul-noche` o los de gradiente | `-negro` teñido, o las de degradado | el extremo oscuro asienta la figura                                                                   |
| **Oscuro** (azul noche, azul profundo, fotografía, video) | **`isotipo-blanco`**                    | **`-blanco`**                       | es la única que garantiza contraste; ninguna otra se sostiene                                         |
| Azul noche, buscando acento de color                      | `isotipo-cian` (plano)                  | **`-blanco`**                       | en unidades no hay plano de color: `-cian` es un degradado que **termina en noche** y ahí se partiría |

**Mínimo 3:1 entre el trazo y su fondo** (WCAG 2.2, 1.4.11: elementos gráficos
no textuales). El logo no es decoración: si no se distingue, no identifica.

Consecuencia que se pasa por alto: **las variantes de degradado terminan en azul
noche, así que sobre fondo oscuro pierden ese extremo** y la figura se corta por
la mitad. Sobre oscuro va `-blanco`, siempre. Y `-blanco` sobre fondo claro es
el mismo error al revés: desaparece.

**Patrón de URL:** `/marca/RUTA`

### Qué activo usar — guía de decisión

Se resuelve con tres preguntas, en este orden. La primera decide **qué pieza**;
la segunda, **qué color**; la tercera es la que más se olvida.

#### 1. ¿Dónde va?

| Situación                                  | Activo                                | Por qué                                                |
| ------------------------------------------ | ------------------------------------- | ------------------------------------------------------ |
| Encabezado de web o app                    | `lockup-horizontal-corporativo`       | símbolo + palabra, en el formato que cabe en una barra |
| Firma de correo, membrete                  | `lockup-horizontal-corporativo`       | igual, y sobrevive al reenvío                          |
| Portada, red social, splash                | `lockup-vertical-corporativo`         | proporción retrato                                     |
| **Contrato, factura, papelería registral** | `lockup-*-sas-*` o `logotipo-sas-*`   | ahí debe constar el **nombre legal**                   |
| Avatar, sello, app icon, marca de agua     | `isotipo`                             | solo el símbolo; no hay espacio para leer              |
| Ícono de línea de producto en interfaz     | `unidad-LADO-negro` teñida con `mask` | un archivo, todos los colores (ver §12)                |
| Chip, tarjeta o pieza expresiva pequeña    | `unidad` de color o de degradado      | el color identifica la línea                           |
| Pestaña del navegador                      | `favicon.svg`                         | trae su propio fondo, funciona en tema claro y oscuro  |
| Pantalla de inicio de iOS                  | `apple-touch-icon.png`                | opaco; iOS pone su propia máscara                      |
| Pestaña fijada de Safari                   | `mask-icon.svg`                       | monocromo, lo tiñe el navegador                        |
| Buscadores, `webmanifest`                  | `icon-512.png`                        |                                                        |

#### 2. ¿Sobre qué fondo?

Lo resuelve **T2** más arriba: fondo claro → azul noche, negro teñido o degradado;
fondo oscuro → **`-blanco`**, sin excepción. Mínimo 3:1 de contraste.

#### 3. ¿Se imprime a una tinta?

Entonces `-negro`, aunque el fondo sea claro. Los degradados no sobreviven a una
fotocopia, un fax ni un sello. Es la pregunta que nadie hace y la que produce
membretes ilegibles.

#### Cuándo NO usar cada uno

- **Razón social en producto o marketing.** `Evetev S.A.S.` alarga el logotipo y
  no aporta nada fuera de lo legal. En web y app va el lockup normal.
- **Unidad en lugar del isotipo.** La media unidad identifica una _línea de
  producto_, no a la empresa. Nunca sustituye al isotipo en la marca principal.
- **Degradados fuera de piezas expresivas** (C6): prohibidos en botones, texto y
  componentes funcionales.
- **Mascota en documentos legales, facturas o en el flujo de pago** de EvePay.
- **Recolorear un SVG servido como `<img>` con CSS.** `fill: currentColor` no cruza la
  frontera de un `<img>`. Por eso existen las variantes ya hechas; si falta un
  color, se agrega al repositorio en vez de improvisarlo.

### Isotipo (el símbolo: dos rombos entrelazados)

| Archivo                                      | Cuándo                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `isotipos/isotipo-azul-noche.svg`            | **Por defecto**, sobre fondos claros                                      |
| `isotipos/isotipo-blanco.svg`                | **Fondos oscuros o fotografía** — la única que asegura contraste ahí (T2) |
| `isotipos/isotipo-cian.svg`                  | Sobre azul noche                                                          |
| `isotipos/isotipo-teal.svg`                  | Color heredado                                                            |
| `isotipos/isotipo-gradiente-corporativo.svg` | Hero, portadas, piezas expresivas                                         |
| `isotipos/isotipo-gradiente-ia.svg`          | Piezas de Eve Intelligence                                                |

### Unidades (media unidad = ícono de línea de producto)

Cada variante existe en **izquierda** y **derecha**. El trazo es idéntico en
todas: solo cambia el color, nunca el dibujo (T1).

| Variante     | Colores                  | Para qué                                                                            |
| ------------ | ------------------------ | ----------------------------------------------------------------------------------- |
| `-negro`     | `#000000`                | base para teñir con `mask` desde CSS                                                |
| `-blanco`    | `#FFFFFF`                | **obligatoria sobre fondos oscuros** (T2): asegura el contraste sin recolorear nada |
| `-degradado` | noche → eléctrico → cian | corporativo, piezas expresivas                                                      |
| `-coral`     | noche ↔ `#EE3D22`        | pieza expresiva                                                                     |
| `-cian`      | noche ↔ `#22D3EE`        | pieza expresiva                                                                     |
| `-electrico` | noche ↔ `#1E6FEB`        | pieza expresiva                                                                     |
| `-violeta`   | noche ↔ `#8B5CF6`        | pieza expresiva                                                                     |
| `-ambar`     | noche ↔ `#EB9A1E`        | pieza expresiva; el ámbar es complementario del eléctrico, **no es color de marca** |

Todas las de color degradan **contra azul noche `#0A2540`**, no contra negro
puro: es lo que hace el degradado corporativo y lo que pide C4. Mezclar dos
tintas saturadas se probó antes y se descartó — en el centro se ensucian y dan
impresión de tinta gastada.

El degradado va **en espejo**: la izquierda arranca en noche y la derecha
termina en noche, así que al juntarlas el par queda simétrico, con el color
encontrándose en el centro.

Por eso mismo **las de color son para fondo claro**. Su extremo en azul noche se
funde con un fondo oscuro y la figura se parte. Sobre oscuro, `-blanco` (T2).

Los degradados solo en piezas expresivas (C6). Para iconos de producto en
interfaz sigue usándose `-negro` teñido con `mask`, que es lo que permite un
color por línea sin duplicar archivos.

Se usan como **iconos de producto** (EvePay, Eve Intelligence, Tienda). Tamaño recomendado: 30–34 px.
PROHIBIDO usarlas como marca principal o reemplazo del isotipo completo.

### Logotipo y lockups

- `logotipos/logotipo-bicolor.svg` (Eve azul noche + tev eléctrico), `-azul-noche`, `-teal`, `-blanco`, `-negro-minuscula`
- **Con razón social (`Evetev S.A.S.`):** `logotipo-sas-bicolor.svg` · `-sas-azul-noche` · `-sas-blanco` · `-sas-teal` · `-sas-negro-minuscula`. Cada una toma el color de su versión sin razón social, incluida la blanca — que sigue siendo la de fondo oscuro (T2).
- `lockups/lockup-horizontal-negro.svg` · `-corporativo` → encabezados, membretes, firmas de correo
- `lockups/lockup-vertical-negro.svg` · `-corporativo` · `-teal` → portadas, redes, app

**Con razón social — `lockup-horizontal-sas-corporativo.svg` · `-sas-negro.svg`
· `lockup-vertical-sas-corporativo.svg` · `-sas-negro.svg`.**
Dicen **Evetev S.A.S.** Son para documentación oficial: contratos, propuestas
formales, facturas, papelería registral, cualquier pieza donde deba aparecer el
nombre legal completo. **En producto, web y marketing va el lockup normal**: la
razón social ahí sobra y alarga el logotipo sin aportar nada.

El «S.A.S.» está en **azul noche**, no en eléctrico: es nombre legal, no parte
de la marca, y no debe competir con el bicolor del logotipo.

La versión **`-negro`** es el mismo archivo a negro puro, sin degradado: para
impresión a una tinta, sellos, fax, fotocopia y cualquier documento que no
garantice color. A diferencia de los `lockup-*-negro` antiguos —que tienen su
propia maquetación— estas comparten geometría exacta con su `-corporativo`, así
que las dos versiones son intercambiables sin recolocar nada.

Los dos conservan el isotipo y el logotipo **exactos**, sin reescalar ni mover
nada, y con los mismos márgenes que su versión sin razón social. Lo que cambia
es el lienzo:

|            | Lienzo                   | Por qué                                                                                         |
| ---------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| horizontal | 1300 → **2037** de ancho | el texto crece; los elementos no se tocan                                                       |
| vertical   | 1000×700 → **1000×634**  | mantiene el formato retrato, así que el bloque de texto se reduce y se recorta el alto sobrante |

El «S.A.S.» se compuso con la **misma Baloo 2 600** del logotipo, trazada a
curvas —no como `<text>`— para que no dependa de que la fuente esté instalada:
en un Word o un PDF ajeno se vería con otra tipografía justo donde más se nota.

### Favicon y mascota

Juego completo (`favicon/`):

| Archivo                        | Para qué                              | Fondo                        |
| ------------------------------ | ------------------------------------- | ---------------------------- |
| `favicon.svg`                  | pestaña, por defecto                  | rombo redondeado azul noche  |
| `favicon-32.png`               | respaldo para navegadores sin SVG     | transparente en las esquinas |
| `apple-touch-icon.png` 180×180 | pantalla de inicio de iOS             | **opaco y a sangre**         |
| `icon-512.png` 512×512         | buscadores, y manifest cuando lo haya | **opaco y a sangre**         |
| `mask-icon.svg`                | pestaña fijada de Safari              | transparente, monocromo      |

```html
<link rel="icon" href="/marca/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/marca/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="/marca/apple-touch-icon.png" />
<link rel="mask-icon" href="/marca/mask-icon.svg" color="#0A2540" />
<meta name="theme-color" content="#0A2540" />
```

**El `apple-touch-icon` y el `icon-512` van opacos y sin esquinas redondeadas
propias.** iOS y Android aplican su propia máscara; si el archivo ya viene
redondeado y con las esquinas transparentes, iOS lo compone sobre **negro** y
redondea encima. En este icono el efecto es sutil —el fondo de marca ya es casi
negro—, pero las esquinas salían en `#000000` en vez de azul noche. El
`favicon-32.png` sí conserva las esquinas transparentes: ahí es lo correcto,
porque debe dejar ver el fondo de la pestaña.

**El `mask-icon` lleva el símbolo completo, rombo y chevron.** Safari lo pinta
de un solo color plano y el color lo fija el atributo `color` del `<link>`, no
el archivo.

Se evaluó dejarlo solo con el rombo y **se decidió conservar el chevron a
sabiendas**: a 16 px —el tamaño de una pestaña fijada— el trazo interior no se
lee como chevron sino como una mancha junto al borde, porque sin color que los
separe dos trazos finos a esa distancia se funden. A partir de 24 px se
distingue bien. Se eligió mantener el símbolo íntegro antes que ganar nitidez
con una silueta que cualquiera podría tener. **No es un descuido: revertirlo a
solo el rombo es quitar el segundo `<path>`.**

Los dos PNG se generan desde `favicon.svg` quitándole el `rx="190"` del fondo.

**Pendiente para cuando haya `webmanifest`:** faltan los 192 px y una variante
`maskable` con zona de respeto, que Android recorta a círculo. Hoy ninguna app
declara manifest, así que sería trabajo sin uso.
Mascota: 23 poses en `mascota/`, todas `.webp` 1024×1024 con transparencia
(`mascota.webp` es la neutra, a 512). Lista la carpeta antes de citar una: no
deduzcas el nombre. **PROHIBIDA** en documentos legales, facturas, contratos y
en el flujo de pago de EvePay.

### Ilustraciones de apoyo (estas SÍ se generan)

A diferencia de logos, isotipos y mascota —que **nunca** se dibujan a mano ni se
generan—, las ilustraciones de escena sí se producen con un modelo de imagen. No
representan a Evetev: ilustran el contexto de un producto (un conjunto
residencial para EveConecta, un comercio para EvePay).

Para que parezcan una familia y no un muestrario, **se generan siempre con este
prompt**, cambiando solo lo que va entre corchetes:

```text
Crea una imagen de un [Objeto a dibujar] en formato apaisado 2:1 con este estilo visual:

Estética wireframe de gráficos vectoriales puros: el objeto se compone solo de líneas que delinean sus bordes, sin texturas y sin sombreado. Solo las formas generales, con mucho aire entre los elementos y sin saturar de detalles. Pocos objetos, bien separados.

El fondo es blanco puro. NO pintes detrás de los objetos ninguna mancha, aureola, nube ni degradado de fondo: no hay ninguna fuente de luz aparte de las propias líneas.

Cada línea del dibujo emite su propio resplandor: un halo azul muy tenue, suave y estrecho, que la envuelve y se desvanece enseguida. Tomado línea a línea es casi imperceptible; lo que se ve es el efecto acumulado, una atmósfera azulada muy leve que aparece sola donde hay más trazos juntos y desaparece donde el dibujo se queda vacío. Toda la luz de la imagen nace de las líneas y de nada más. Sin desenfocarlas ni engordarlas: el trazo sigue nítido dentro de su halo.

Las líneas describen la profundidad con el color: azul noche #0A2540 en los elementos del primer plano, azul eléctrico #1E6FEB en los del fondo, y más tenues cuanto más lejos. Grosor uniforme, esquinas redondeadas y remates suaves: nada de ángulos duros ni vértices en punta.

Los elementos grandes de la escena van SIEMPRE en línea, huecos, sin relleno oscuro. Si alguno necesita separarse del resto, rellénalo de azul hielo #EAF2FB, un tono casi blanco que da volumen sin oscurecer. La composición tiene que quedar predominantemente clara y ligera.

Dibuja ÚNICAMENTE lo que pertenece al tema pedido. NO añadas ningún objeto ajeno a ese tema para cumplir ninguna de estas reglas: las reglas dicen CÓMO dibujar la escena, nunca QUÉ meter en ella.

El azul noche sólido como relleno ocupa MENOS DEL 5% de la superficie de la imagen, y solo en piezas pequeñas —cada una por debajo de una vigésima parte del ancho de la imagen— que ya formen parte del tema. Nunca en los volúmenes grandes ni en superficies extensas.

Exactamente dos de esas piezas pequeñas, situadas en los extremos de la composición, llevan ese relleno azul noche #0A2540, y sobre ellas —y solo sobre ellas— unos pocos acentos luminosos en cian #22D3EE que emiten un brillo intenso, como luz encendida dentro del objeto. Son dos puntos de luz menudos en una escena clara, no dos bloques.

Regla: no dejar líneas muy juntas, porque de lejos se funden en una mancha gris. Los trazos van sueltos y separados.

Sin textos.
```

**El prompt existe para que la escena case con la mascota.** Esa fue la
revisión que lo dejó como está. Las versiones anteriores usaban una sola tinta
`#1E6FEB` y, puestas al lado de Eve, no parecían de la misma marca. El
diagnóstico está en el degradado corporativo (§2),
`#0A2540 → #1E6FEB → #22D3EE`: **la mascota vive en los dos extremos** —cuerpo
azul noche, brillo cian— y **las escenas vivían solo en el medio**. Usaban
tramos distintos de la misma escala y por eso no se tocaban nunca.

Siete cosas del prompt no son adorno y conviene no editarlas a la ligera:

- **Cada color tiene un oficio, y no se intercambian.** `#1E6FEB`
  (`--eve-electrico`) es la línea del fondo; `#0A2540` (`--eve-azul-noche`) es
  la línea del primer plano y la masa de los objetos pequeños; `#22D3EE`
  (`--eve-cian`) es la luz; `#EAF2FB` (`--eve-hielo`) es el relleno de los
  volúmenes grandes que necesiten separarse. Son los tokens exactos (§2), y los
  tres primeros reconstruyen el degradado corporativo.
- **El cian solo va encima de los rellenos oscuros, nunca suelto sobre el
  blanco.** No es gusto: la regla C7 dice que el cian sobre fondo blanco no
  llega al contraste mínimo. Sobre la masa azul noche sí, y además es donde
  parece luz encendida en vez de una línea de color.
- **«Sin textos»** existe porque un modelo de imagen escribe mal, y un rótulo
  torcido en una página de producto se lee como descuido. Si la escena necesita
  un letrero, va en HTML encima, no dentro de la imagen.
- **La regla de los trazos separados** es la que más se nota al usarla: las
  líneas juntas se funden en una mancha gris al reducir, que es justo el tamaño
  al que estas imágenes se ven en una landing. Por eso el prompt pide además
  «pocos objetos»: la escena que más ha fallado fue un conjunto residencial con
  demasiados edificios, donde las fachadas se comieron unas a otras.
- **El relleno oscuro no pasa del 5% y va en objetos pequeños.** Es la regla
  que más ha costado. Sin ella el modelo rellena lo más llamativo —siempre un
  edificio— y la escena se vuelve agresiva: dos manzanas oscuras en un dibujo
  que debía ser ligero. Y hay un motivo que no se ve mirando la imagen suelta:
  **estas escenas se muestran al 20% de opacidad detrás de un texto**, así que
  una masa oscura grande se convierte ahí en un bloque gris que compite con lo
  que hay que leer. Por eso lo grande va hueco, en línea, o relleno de hielo si
  necesita separarse, y la masa baja a un banco, una farola, un coche.

  Son **dos objetos pequeños y en los extremos**. Dos, porque el límite es lo
  que hace la imagen interesante en vez de plana: más manchas la devuelven al
  muestrario. Y en los extremos porque las portadas le abren al dibujo un hueco
  radial en el centro para que las líneas no crucen el titular: se generó una
  con los elementos centrados y el color no se veía **ni subiendo la
  opacidad**. La imagen mental que hay que darle al modelo es «dos puntos de
  luz menudos en una escena clara, no dos bloques».

- **Las reglas dicen cómo dibujar, nunca qué dibujar.** Va en su propio párrafo
  porque el modelo confunde las dos cosas. La versión anterior ilustraba el
  tamaño con una lista suelta —«un banco, una farola, un coche, una puerta, un
  buzón»— y el modelo la leyó como una lista de la compra: metió una farola y un
  coche **dentro de un flujo de pago**, donde no pintan nada. El prompt original
  no tenía ese problema porque sus ejemplos iban atados a su escena («…si es un
  paisaje urbano», «…si es un carro»); al reescribirlo se perdió esa condición.
  Ahora el tamaño se dice con un criterio —por debajo de una vigésima parte del
  ancho— que no se puede dibujar, y la prohibición está aparte para que aplique
  a todas las reglas y no solo a esa. Si a una escena le falta un segundo
  elemento que iluminar, se dice **en el corchete**, que es donde va el
  contenido.
- **El halo se describe por acumulación, y el fondo se prohíbe explícitamente.**
  Es la diferencia entre luz y mancha. Pedir «una aureola detrás del objeto» le
  hace pintar al modelo un borrón centrado, que es exactamente lo que no
  queremos; describirlo como el resplandor de cada línea, casi invisible por
  separado y perceptible al juntarse, da la atmósfera sin ensuciar. La
  prohibición del degradado de fondo está en mayúsculas porque el modelo
  reincide.

  Un aviso al usarlo: un halo azul sobre blanco **baja el contraste del trazo**,
  así que si la imagen va detrás de texto hay que volver a mirar que el texto
  siga leyéndose. Se mide componiendo la imagen a la opacidad real sobre un
  lienzo y buscando el peor píxel de la banda del texto; en las portadas de hoy
  da 11:1, con holgura sobre el 4,5 que exige AA.

- **Las esquinas redondeadas** son el otro puente con la mascota, que es toda
  curva y esquina blanda. Un wireframe de vértices en punta al lado de Eve
  parece de otra marca. Si el modelo se pasa y la escena queda de juguete, el
  ajuste es «esquinas ligeramente redondeadas».

**Colores que se descartaron, y por qué no volver a ellos:** el violeta es
territorio de Eve Intelligence —la regla C3 dice que **solo** identifica esa
vertical— y gastarlo en una escena de producto se lo quita. El verde `#16A34A`
es `--eve-exito`, un color **semántico**: en el dashboard significa «aprobado»,
«confirmada», así que de adorno el ojo lo lee como un indicador de estado. Y el
teal `#3BAEC2` llegó a estar en el prompt unas horas, hasta que la revisión de
la mascota reorganizó la paleta entera alrededor del degradado corporativo y
dejó de tener sitio.

**Estas ilustraciones SIEMPRE se generan. Nunca se dibujan en SVG a mano.**

Durante un tiempo el manual decía lo contrario: que una escena simple saliera
más barata dibujada en código, porque un SVG de línea pesa 6 KB en vez de 200 y
es nítido a cualquier tamaño. Los números eran ciertos y la conclusión era mala.
Se dibujaron dos así —una calle de comercios y un flujo de pago— y el resultado
**parece hecho por un niño**: prismas regulares, ángulos iguales, cero
irregularidad. Un dibujo programático no tiene mano. Puesto en una página de
producto, eso no se lee como «minimalista», se lee como «no había presupuesto».

Los 194 KB de diferencia no valen esa impresión. **Se genera siempre**, y el
peso se arregla en la conversión, que es donde toca arreglarlo.

**Antes de publicarla, conviértela a WebP con transparencia:**

|                  |                                                       |
| ---------------- | ----------------------------------------------------- |
| formato          | **WebP**, no PNG ni JPG                               |
| ancho            | 2048 px (basta de sobra; el sitio la muestra a ~1000) |
| calidad          | 80                                                    |
| calidad del alfa | 50                                                    |
| resultado        | **~200 KB**                                           |

Tres cosas de esa tabla no son intercambiables:

- **JPG queda descartado por no tener transparencia**, no por calidad. Estas
  escenas van de fondo con `background-size:contain`, así que sobra ancho a los
  lados: con un fondo blanco opaco se ve el **rectángulo de la imagen recortado**
  contra el degradado de la portada. Hay que convertir el blanco del original a
  alfa al generar el WebP.
- **El canal alfa cuesta la mitad del archivo.** Medido sobre la escena de
  EveConecta: 96 KB sin transparencia, 202 KB con ella. Es caro y no es
  opcional; bajar la calidad del alfa a 50 recorta ~140 KB sin que se note,
  porque el alfa de una línea es casi binario.
- **La calidad apenas mueve el peso, el ancho sí.** De calidad 82 a 60 se
  ahorran unos 15 KB; de 2816 px a 1600 px se ahorran 150. Si hay que recortar,
  recorta píxeles, no calidad.

PNG sirve si algo va mal con WebP, pero pesa cinco veces más para el mismo
resultado. AVIF pesa aún menos que WebP y hoy lo soportan todos los navegadores
que nos importan; si alguien quiere probarlo, que mida antes de cambiar la
norma.

**Al usarla:** va de fondo, atenuada y desvanecida, nunca a plena opacidad
detrás de un texto. Es línea densa y compite con lo que hay que leer. El patrón
es `.portada::after` en `apps/website/conecta/estilos.css`.

**Y súbela a `packages/brand/ilustraciones/`**, más la línea que la añade al
manifiesto de `scripts/marca-sync.mjs` para la app que la vaya a usar. Sin esa
línea el archivo está en el repositorio y no lo sirve nadie: la página da 404.
Antes esto era «etiquetar una versión y purgar el CDN», con dos formas conocidas
de fallar en silencio; ahora falla en el CI, que es donde debe fallar.

> Los archivos publicados de esta carpeta cuentan la historia de estas reglas y
> **ninguno es la referencia de estilo; la referencia es el prompt.**
> `conjunto-residencial.webp` es anterior a él y tiene trazos violeta.
> `conjunto-residencial-color.svg`, `conjunto-residencial.svg`, `comercio.svg` y
> `flujo-de-pago.svg` son los dibujados a mano, de la época en que esto
> recomendaba SVG. Siguen publicados porque lo publicado no se retira, pero
> **hay que reemplazarlos por versiones generadas.**

### Snippet de logo en encabezado

```html
<a class="logo" href="/" aria-label="Evetev inicio">
  <img src="/marca/isotipo-azul-noche.svg" alt="" width="32" height="23" />
  <span class="brand">Evetev</span>
</a>
```

Accesibilidad: si el texto "Evetev" acompaña al logo, la imagen es decorativa → `alt=""`.
Si el logo va solo, `alt="Evetev"`.

---

## 5. Forma, espacio y movimiento

```css
/* Radios */
--r-sm: 8px; /* inputs, chips */
--r-md: 12px; /* tarjetas, modales */
--r-lg: 16px; /* contenedores hero */
--r-pill: 999px; /* botones y badges — SIEMPRE pill */
```

- **Grilla base 4 px.** Espaciados: 8/12/16/24/32/48/64.
- **Ancho de contenido:** `max-width:1040px` con `padding:0 clamp(24px,4.5vw,32px)`.
- **Iconografía:** trazo de 2 px con terminales redondeados (estilo Tabler/Lucide), 24 px base. Nunca iconos rellenos pesados.
- **Elevación:** máximo dos niveles de sombra, sutiles: `0 8px 24px rgba(10,37,64,.08)`. La jerarquía se logra con espacio y color.
- **Movimiento:** transiciones 150–250 ms `ease-out`. Respetar `@media(prefers-reduced-motion:reduce)`.
- PROHIBIDO: esquinas vivas en botones, sombras duras, bordes gruesos decorativos, animaciones en flujos de pago.

---

## 6. Componentes (copiar estos patrones)

### Botones

```css
.btn {
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.85rem;
  padding: 11px 24px;
  transition: 0.15s;
  border: none;
  cursor: pointer;
  font-family: "Inter", sans-serif;
}
.btn-cta {
  background: var(--eve-coral);
  color: #fff;
} /* primario — uno por vista */
.btn-cta:hover {
  background: var(--eve-coral-hover);
}
.btn-sec {
  background: var(--eve-mezclado);
  color: #fff;
} /* secundario */
.btn-ghost {
  background: none;
  border: 1px solid #d7e3f0;
  color: var(--eve-azul-noche);
  font-weight: 500;
}
```

Jerarquía: **coral** (acción principal) → **mezclado** (secundaria) → **ghost** (terciaria) → **enlace** (`color:var(--eve-electrico)`).

### Tarjetas

```css
.card {
  background: #fff;
  border: 1px solid var(--eve-linea);
  border-radius: 14px;
  overflow: hidden;
  transition: 0.2s;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(10, 37, 64, 0.09);
}
.card .cuerpo {
  padding: 18px 22px 22px;
}
.card h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 5px;
}
.card p {
  font-size: 0.82rem;
  color: var(--eve-pizarra);
}
```

Variante minimalista (preferida en listados de servicios): sin fondo ni sombra, separadas por
`border-right:1px solid var(--eve-linea)` en grilla.

### Navegación

```css
nav {
  position: sticky;
  top: 0;
  background: rgba(253, 254, 255, 0.95);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--eve-linea);
  z-index: 50;
}
.nav-in {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
}
.menu {
  display: flex;
  gap: 26px;
  font-size: 0.85rem;
  color: var(--eve-pizarra);
}
```

Móvil (≤760px): menú hamburguesa de 3 líneas (20×2 px, gap 4 px), panel desplegable a ancho completo.

### Formularios

```css
label {
  display: block;
  font-size: 0.82rem;
  font-weight: 500;
  margin-bottom: 6px;
}
input,
select,
textarea {
  width: 100%;
  padding: 11px 14px;
  border: 1px solid #dce7f2;
  border-radius: 9px;
  font-size: 0.88rem;
  font-family: "Inter";
  background: #fff;
  color: var(--eve-azul-noche);
}
input:focus {
  outline: 2px solid var(--eve-electrico);
  border-color: transparent;
}
```

**Checkbox dentro de caja** (patrón oficial): `gap:14px`, casilla `17×17px`, `accent-color:var(--eve-electrico)`,
contenedor con `padding:13px 16px;border:1px solid #DCE7F2;border-radius:9px`.
`label` real siempre asociado; errores ligados con `aria-describedby`.

### Footer

Fondo `--eve-azul-noche`, texto `#B9CCE0`, títulos de columna en blanco mayúsculas 0.8rem.
4 columnas (marca + 3 de enlaces) → 2 en tablet → 1 en móvil. Enlaces `:hover{color:var(--eve-cian)}`.
Incluir: bloque de suscripción con botón coral, barra base con © y enlaces legales
(Términos · Privacidad · **Tratamiento de datos** — obligatorio en Colombia), redes en círculos con borde.

### Otros componentes

- **Tabs:** contenedor pill `background:var(--eve-tinte);padding:4px`, pestaña activa `background:#fff` + sombra sutil.
- **Acordeón (FAQ):** `<details>`/`<summary>` con `border-bottom:1px solid var(--eve-linea)`, marcador `+`/`–` en azul eléctrico.
- **Modal:** overlay `rgba(10,37,64,.35)`, caja `border-radius:16px;padding:34px;max-width:400px`, cierre con Esc y clic fuera.
- **Toast:** fijo abajo centrado, `background:var(--eve-azul-noche);color:#fff;border-radius:999px`, se oculta a los ~2.6 s.
- **Slider/Switch:** `accent-color:var(--eve-mezclado)`; switch activo `background:var(--eve-mezclado)`.
- **Banda de imagen (portada):** `object-fit:cover` + velo `rgba(10,37,64,.42)` + contenido centrado en blanco.

---

## 7. Responsive (obligatorio en todo artefacto web)

```css
/* Tablet */
@media (max-width: 1024px) {
  /* grillas 3 → 2 columnas */
}
/* Móvil */
@media (max-width: 760px) {
  /* 1 columna · hamburguesa · botones a ancho completo · padding 26px */
}
/* Amplio */
@media (min-width: 1440px) {
  .wrap {
    max-width: 1160px;
  }
}
/* Ultra-wide */
@media (min-width: 1900px) {
  html {
    font-size: 17.5px;
  }
  .wrap {
    max-width: 1280px;
  }
}
```

Reglas: mobile-first · tipografía fluida con `clamp` · áreas táctiles ≥44 px · sin scroll horizontal ·
en ultra-wide el contenido **no se estira**, respira.

---

## 8. Accesibilidad (WCAG 2.2 AA — no negociable)

- HTML semántico: `button` para acciones, `a` para navegación, encabezados sin saltos.
- Contraste ≥4.5:1 en texto normal, ≥3:1 en texto grande y controles.
- Navegable 100% por teclado; **foco visible siempre** (`outline:2px solid var(--eve-electrico)`).
- `label` real en cada campo; errores claros ligados al campo.
- `alt` descriptivo en imágenes informativas, `alt=""` en decorativas.
- Nunca comunicar información solo con color.
- Respetar `prefers-reduced-motion`.

---

## 9. Tono de voz (para el texto que generes)

- **Español claro, sin jerga.** "Estado de cuenta", no "balance ledger".
- **Directo y honesto.** La marca vende transparencia: nada de letra menuda, promesas vagas ni superlativos vacíos.
- **Cercano pero profesional.** Tuteo ("tu negocio", "cuéntanos"), sin informalidad excesiva ni emojis en UI.
- **Frases cortas.** Un titular = una idea.
- PROHIBIDO: "revolucionario", "líderes del mercado", "soluciones 360", "sinergia", exclamaciones múltiples.
- Ejemplos de la voz correcta: _"Pagos e inteligencia artificial, sin complicaciones"_ · _"Tarifas transparentes. Tecnología propia. Cero letra menuda."_ · _"Construido por ingenieros."_

**Dato de negocio:** EvePay cobra **un porcentaje por transacción más un componente fijo**, más suscripción
mensual del software. NUNCA escribir "tarifa fija sin porcentaje" (información obsoleta).

---

## 10. Checklist de autoverificación (ejecutar antes de entregar)

Antes de devolver cualquier artefacto, confirma:

- [ ] ¿Usé las rutas `/marca/…` para el logo, sin dibujarlo a mano?
- [ ] ¿Hay **exactamente un** botón coral por pantalla?
- [ ] ¿El violeta aparece solo en contexto de Eve Intelligence y **no** en botones?
- [ ] ¿Todos los botones son pill (`border-radius:999px`)?
- [ ] ¿Cargué Baloo 2 + Inter y las apliqué a titulares/cuerpo respectivamente?
- [ ] ¿Hay media queries para móvil, tablet y ultra-wide?
- [ ] ¿El foco es visible y todo se navega con teclado?
- [ ] ¿Los errores llevan ícono + texto, no solo color?
- [ ] ¿El modo oscuro usa `#081D33` y no negro puro?
- [ ] ¿El texto evita jerga y las palabras prohibidas del §9?

---

## 11. Plantilla mínima de arranque (copiar y extender)

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Evetev — [título]</title>
    <link rel="icon" href="/marca/favicon.svg" type="image/svg+xml" />
    <meta name="theme-color" content="#0A2540" />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600&display=swap"
    />
    <link rel="stylesheet" href="/marca/colores.css" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: "Inter", sans-serif;
        color: var(--eve-azul-noche);
        background: #fdfeff;
        line-height: 1.65;
      }
      h1,
      h2 {
        font-family: "Baloo 2", sans-serif;
        font-weight: 600;
      }
      .wrap {
        max-width: 1040px;
        margin: 0 auto;
        padding: 0 clamp(24px, 4.5vw, 32px);
      }
      .btn {
        border-radius: 999px;
        font-weight: 600;
        font-size: 0.85rem;
        padding: 11px 24px;
        border: none;
        cursor: pointer;
        transition: 0.15s;
      }
      .btn-cta {
        background: var(--eve-coral);
        color: #fff;
      }
      .btn-cta:hover {
        background: var(--eve-coral-hover);
      }
      :focus-visible {
        outline: 2px solid var(--eve-electrico);
        outline-offset: 2px;
      }
      @media (max-width: 760px) {
        .wrap {
          padding: 0 26px;
        }
      }
      @media (min-width: 1900px) {
        html {
          font-size: 17.5px;
        }
        .wrap {
          max-width: 1280px;
        }
      }
    </style>
  </head>
  <body>
    <!-- contenido -->
  </body>
</html>
```

---

## 12. Referencia rápida (tabla de decisión)

| Necesito…                    | Uso                                              |
| ---------------------------- | ------------------------------------------------ |
| Botón de acción principal    | `--eve-coral`, pill, uno por vista               |
| Botón secundario             | `--eve-mezclado`                                 |
| Enlace de texto              | `--eve-electrico`                                |
| Fondo de sección alterna     | `--eve-tinte` o `--eve-hielo`                    |
| Sección de peso / footer     | `--eve-azul-noche`                               |
| Identificar EvePay           | azul eléctrico + unidad izquierda                |
| Identificar Eve Intelligence | violeta + unidad derecha                         |
| Identificar Tienda           | teal + unidad izquierda                          |
| Titular grande               | Baloo 2 600, `clamp(1.9rem,4.6vw,2.6rem)`        |
| Cifra o monto destacado      | Baloo 2 700                                      |
| Texto de interfaz            | Inter 400/500                                    |
| Ícono de producto            | unidad SVG de `/marca/`, 30–34 px                |
| Marca en encabezado          | isotipo azul noche 32 px + "Evetev" en Baloo 600 |
