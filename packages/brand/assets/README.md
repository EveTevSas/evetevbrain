# Evetev — Activos de marca

Logos, isotipos, favicon, mascota y tokens de color de **Evetev S.A.S.**

**Esta carpeta es la fuente, no lo que se sirve.** Cada app publica los activos que usa en su propio origen, bajo `/marca/<archivo>`; la carpeta pública la llena `pnpm marca:sync` desde el manifiesto de `scripts/marca-sync.mjs`, y el CI comprueba que las copias no se desvíen. Las URLs de este catálogo son las que ve el navegador.

> Hasta agosto de 2026 esto era un repositorio público aparte (`Evetev-Dev/brand`) servido por jsDelivr. Se borró, junto con su ritual de etiquetar y purgar. Cualquier URL de `cdn.jsdelivr.net/gh/Evetev-Dev/brand` que encuentres por ahí está muerta.

> Fuente de verdad visual: **Manual de imagen corporativa v2.0**. Este repo solo distribuye; las reglas de uso viven en el manual.

---

## Uso rápido

\<\!-- Isotipo \--\>

\<img src="/marca/isotipo-azul-noche.svg"

     alt="Evetev" height="32"\>

\<\!-- Lockup completo \--\>

\<img src="/marca/lockup-horizontal-negro.svg"

     alt="Evetev" height="40"\>

\<\!-- Favicon \--\>

\<link rel="icon" href="/marca/favicon.svg" type="image/svg+xml"\>

\<link rel="apple-touch-icon" href="/marca/apple-touch-icon.png"\>

\<meta name="theme-color" content="\#0A2540"\>

\<\!-- Tokens de color \--\>

\<link rel="stylesheet" href="/marca/colores.css"\>

/\* Con los tokens importados \*/

.boton-primario{ background:var(--eve-coral); border-radius:var(--eve-radio-pill); }

.boton-primario:hover{ background:var(--eve-coral-hover); }

**Patrón de URL:** `/marca/RUTA`

---

## Catálogo

### `isotipos/` — el símbolo (dos rombos entrelazados)

| Archivo                             | Cuándo usarlo                                                             | URL                                        |
| :---------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------- |
| `isotipo-azul-noche.svg`            | Fondos claros. **Uso por defecto.**                                       | `/marca/isotipo-azul-noche.svg`            |
| `isotipo-blanco.svg`                | **Fondos oscuros o fotografía** — la única que asegura contraste ahí (T2) | `/marca/isotipo-blanco.svg`                |
| `isotipo-cian.svg`                  | Sobre azul noche                                                          | `/marca/isotipo-cian.svg`                  |
| `isotipo-teal.svg`                  | Color heredado del original                                               | `/marca/isotipo-teal.svg`                  |
| `isotipo-gradiente-corporativo.svg` | Hero, portadas, piezas expresivas                                         | `/marca/isotipo-gradiente-corporativo.svg` |
| `isotipo-gradiente-ia.svg`          | Piezas de Eve Intelligence                                                | `/marca/isotipo-gradiente-ia.svg`          |
| `isotipo-gradiente-azul-cian.svg`   | Degradado corto, usos pequeños                                            | `/marca/isotipo-gradiente-azul-cian.svg`   |

### `unidades/` — media unidad, ícono de línea de producto

Identifican líneas de producto (EvePay, Eve Intelligence, Tienda). **Nunca sustituyen al isotipo completo en la marca principal.**

Cada variante existe en `izquierda` y `derecha`; el trazo es idéntico en todas.

| Variante     | Cuándo usarla                                                                                                  | URL (sustituye `LADO` por `izquierda` o `derecha`) |
| :----------- | :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `-negro`     | **Ícono de producto en interfaz.** Se tiñe con `mask` en CSS, así un solo archivo sirve para todos los colores | `/marca/unidad-LADO-negro.svg`                     |
| `-blanco`    | **Obligatoria sobre fondo oscuro** (T2)                                                                        | `/marca/unidad-LADO-blanco.svg`                    |
| `-degradado` | Corporativa, pieza expresiva                                                                                   | `/marca/unidad-LADO-degradado.svg`                 |
| `-coral`     | Pieza expresiva                                                                                                | `/marca/unidad-LADO-coral.svg`                     |
| `-cian`      | Pieza expresiva                                                                                                | `/marca/unidad-LADO-cian.svg`                      |
| `-electrico` | Pieza expresiva                                                                                                | `/marca/unidad-LADO-electrico.svg`                 |
| `-violeta`   | Pieza expresiva                                                                                                | `/marca/unidad-LADO-violeta.svg`                   |
| `-ambar`     | Pieza expresiva. **El ámbar no es color de marca**: es el complementario del eléctrico                         | `/marca/unidad-LADO-ambar.svg`                     |

Las de color degradan **contra azul noche**, así que **son para fondo claro**: sobre oscuro pierden ese extremo y la figura se parte.

### `logotipos/` — la palabra "Evetev" (Baloo 2 en contornos)

| Archivo                        | Cuándo usarlo                                   | URL                                   |
| :----------------------------- | :---------------------------------------------- | :------------------------------------ |
| `logotipo-bicolor.svg`         | **Por defecto.** Eve azul noche + tev eléctrico | `/marca/logotipo-bicolor.svg`         |
| `logotipo-azul-noche.svg`      | Una sola tinta, fondo claro                     | `/marca/logotipo-azul-noche.svg`      |
| `logotipo-blanco.svg`          | Fondo oscuro (T2)                               | `/marca/logotipo-blanco.svg`          |
| `logotipo-teal.svg`            | Color heredado                                  | `/marca/logotipo-teal.svg`            |
| `logotipo-negro-minuscula.svg` | Variante "evetev" en minúsculas                 | `/marca/logotipo-negro-minuscula.svg` |

**Con razón social** — dicen `Evetev S.A.S.` Para documentación oficial; en producto y marketing va el logotipo normal.

| Archivo                            | URL                                       |
| :--------------------------------- | :---------------------------------------- |
| `logotipo-sas-bicolor.svg`         | `/marca/logotipo-sas-bicolor.svg`         |
| `logotipo-sas-azul-noche.svg`      | `/marca/logotipo-sas-azul-noche.svg`      |
| `logotipo-sas-blanco.svg`          | `/marca/logotipo-sas-blanco.svg`          |
| `logotipo-sas-teal.svg`            | `/marca/logotipo-sas-teal.svg`            |
| `logotipo-sas-negro-minuscula.svg` | `/marca/logotipo-sas-negro-minuscula.svg` |

### `lockups/` — isotipo \+ logotipo juntos

**Horizontal** para encabezados, membretes y firmas de correo. **Vertical** para portadas, redes y splash.

| Archivo                             | Cuándo usarlo              | URL                                        |
| :---------------------------------- | :------------------------- | :----------------------------------------- |
| `lockup-horizontal-corporativo.svg` | **Encabezado por defecto** | `/marca/lockup-horizontal-corporativo.svg` |
| `lockup-horizontal-negro.svg`       | Impresión a una tinta      | `/marca/lockup-horizontal-negro.svg`       |
| `lockup-vertical-corporativo.svg`   | **Portada por defecto**    | `/marca/lockup-vertical-corporativo.svg`   |
| `lockup-vertical-negro.svg`         | Impresión a una tinta      | `/marca/lockup-vertical-negro.svg`         |
| `lockup-vertical-teal.svg`          | Color heredado             | `/marca/lockup-vertical-teal.svg`          |

**Con razón social** — dicen `Evetev S.A.S.`, para contratos, facturas y papelería registral:

| Archivo                                 | URL                                            |
| :-------------------------------------- | :--------------------------------------------- |
| `lockup-horizontal-sas-corporativo.svg` | `/marca/lockup-horizontal-sas-corporativo.svg` |
| `lockup-horizontal-sas-negro.svg`       | `/marca/lockup-horizontal-sas-negro.svg`       |
| `lockup-vertical-sas-corporativo.svg`   | `/marca/lockup-vertical-sas-corporativo.svg`   |
| `lockup-vertical-sas-negro.svg`         | `/marca/lockup-vertical-sas-negro.svg`         |

### `favicon/`

| Archivo                | Para qué                                  | URL                           |
| :--------------------- | :---------------------------------------- | :---------------------------- |
| `favicon.svg`          | Pestaña, por defecto                      | `/marca/favicon.svg`          |
| `favicon-32.png`       | Respaldo sin SVG                          | `/marca/favicon-32.png`       |
| `apple-touch-icon.png` | Pantalla de inicio de iOS (180 px, opaco) | `/marca/apple-touch-icon.png` |
| `icon-512.png`         | Buscadores y `webmanifest`                | `/marca/icon-512.png`         |
| `mask-icon.svg`        | Pestaña fijada de Safari                  | `/marca/mask-icon.svg`        |

Juego completo para el `<head>`:

    <link rel="icon" href="/marca/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="/marca/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="apple-touch-icon" href="/marca/apple-touch-icon.png">
    <link rel="mask-icon" href="/marca/mask-icon.svg" color="#0A2540">
    <meta name="theme-color" content="#0A2540">

### `mascota/`

`mascota.webp` (512×512, fondo transparente) — Eve. Asistente digital, onboarding, estados vacíos. **No usar** en documentos legales, facturas ni en el flujo de pago de EvePay.

`/marca/mascota.webp`

Los demás sprites de Eve (caminando, riendo, saludando…) **no están publicados aquí**: viven solo en el monorepo, en `packages/brand/assets/mascota/`.

### `tokens/`

`colores.css` (variables CSS listas) · `colores.json` (para Tailwind, Figma o scripts).

---

## Reglas de operación

1. **Siempre `/marca/<archivo>`, con barra inicial.** Una ruta relativa se rompe según se llegue a `/conecta` o a `/conecta/`. Y el activo tiene que estar en el manifiesto: si no está, la ruta es correcta y la imagen no existe.
2. **Los archivos publicados no se sobreescriben.** Si un logo cambia, se publica una versión nueva (`@2`) y las páginas viejas siguen funcionando.
3. **Cambios por PR.** Igual que el resto del código: rama corta, PR, una aprobación. Un logo mal cambiado se replica en todos los proyectos al instante.
4. **SVG externo no se recolorea con CSS** (`fill: currentColor` no cruza la frontera de `<img>`). Por eso existen las variantes de color pre-hechas; si necesitas un color nuevo, se agrega al repo.
5. **Accesibilidad:** logo informativo → `alt="Evetev"`. Logo decorativo junto a texto que ya dice la marca → `alt=""`.

---

## Para las apps del monorepo `evetev/`

Donde se puede, las aplicaciones internas importan los SVG como componentes desde `packages/ui` (cero petición de red, tipados, tree-shaking). `/marca/` es para el HTML plano, los favicon y las imágenes grandes que no tiene sentido incrustar. Para correos y documentos —que no tienen origen propio— se incrusta el SVG o se usa una URL absoluta de `https://evetev.com/marca/…`.

// dentro del monorepo

import { IsotipoEvetev } from '@evetev/ui';

---

## Publicar una versión nueva

git add .

git commit \-m "feat(brand): agrega variante X"

git tag v1.1.0 && git push \--tags

La URL `@1` toma automáticamente la última `1.x`. Para congelar exacto: `@1.1.0`.

---

## Migrar a dominio propio (cuando exista)

Estructura pensada para migrar sin reescribir rutas: publica este repo en `assets.evetev.com` (GitHub Pages o proyecto estático en Vercel) y reemplaza el prefijo:

/marca/... → https://assets.evetev.com/...

---

## Licencia

Marcas y logos © Evetev S.A.S. Todos los derechos reservados. Repo público por conveniencia técnica de distribución; **no** implica licencia de uso a terceros.
