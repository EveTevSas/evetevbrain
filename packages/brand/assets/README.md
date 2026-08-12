# Evetev — Activos de marca

Repositorio público de logos, isotipos, favicon, mascota y tokens de color de **Evetev S.A.S.** Se sirve como CDN vía jsDelivr: cualquier proyecto apunta por URL, sin copiar archivos.

> Fuente de verdad visual: **Manual de imagen corporativa v2.0**. Este repo solo distribuye; las reglas de uso viven en el manual.

---

## Uso rápido

\<\!-- Isotipo \--\>

\<img src="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-azul-noche.svg"

     alt="Evetev" height="32"\>

\<\!-- Lockup completo \--\>

\<img src="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-horizontal-negro.svg"

     alt="Evetev" height="40"\>

\<\!-- Favicon \--\>

\<link rel="icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon.svg" type="image/svg+xml"\>

\<link rel="apple-touch-icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/apple-touch-icon.png"\>

\<meta name="theme-color" content="\#0A2540"\>

\<\!-- Tokens de color \--\>

\<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/tokens/colores.css"\>

/\* Con los tokens importados \*/

.boton-primario{ background:var(--eve-coral); border-radius:var(--eve-radio-pill); }

.boton-primario:hover{ background:var(--eve-coral-hover); }

**Patrón de URL:** `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@VERSION/RUTA`

---

## Catálogo

### `isotipos/` — el símbolo (dos rombos entrelazados)

| Archivo | Cuándo usarlo | URL |
| :---- | :---- | :---- |
| `isotipo-azul-noche.svg` | Fondos claros. **Uso por defecto.** | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-azul-noche.svg` |
| `isotipo-blanco.svg` | **Fondos oscuros o fotografía** — la única que asegura contraste ahí (T2) | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-blanco.svg` |
| `isotipo-cian.svg` | Sobre azul noche | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-cian.svg` |
| `isotipo-teal.svg` | Color heredado del original | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-teal.svg` |
| `isotipo-gradiente-corporativo.svg` | Hero, portadas, piezas expresivas | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-gradiente-corporativo.svg` |
| `isotipo-gradiente-ia.svg` | Piezas de Eve Intelligence | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-gradiente-ia.svg` |
| `isotipo-gradiente-azul-cian.svg` | Degradado corto, usos pequeños | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-gradiente-azul-cian.svg` |

### `unidades/` — media unidad, ícono de línea de producto

Identifican líneas de producto (EvePay, Eve Intelligence, Tienda). **Nunca sustituyen al isotipo completo en la marca principal.**

Cada variante existe en `izquierda` y `derecha`; el trazo es idéntico en todas.

| Variante | Cuándo usarla | URL (sustituye `LADO` por `izquierda` o `derecha`) |
| :---- | :---- | :---- |
| `-negro` | **Ícono de producto en interfaz.** Se tiñe con `mask` en CSS, así un solo archivo sirve para todos los colores | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/unidades/unidad-LADO-negro.svg` |
| `-blanco` | **Obligatoria sobre fondo oscuro** (T2) | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/unidades/unidad-LADO-blanco.svg` |
| `-degradado` | Corporativa, pieza expresiva | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/unidades/unidad-LADO-degradado.svg` |
| `-coral` | Pieza expresiva | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/unidades/unidad-LADO-coral.svg` |
| `-cian` | Pieza expresiva | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/unidades/unidad-LADO-cian.svg` |
| `-electrico` | Pieza expresiva | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/unidades/unidad-LADO-electrico.svg` |
| `-violeta` | Pieza expresiva | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/unidades/unidad-LADO-violeta.svg` |
| `-ambar` | Pieza expresiva. **El ámbar no es color de marca**: es el complementario del eléctrico | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/unidades/unidad-LADO-ambar.svg` |

Las de color degradan **contra azul noche**, así que **son para fondo claro**: sobre oscuro pierden ese extremo y la figura se parte.

### `logotipos/` — la palabra "Evetev" (Baloo 2 en contornos)

| Archivo | Cuándo usarlo | URL |
| :---- | :---- | :---- |
| `logotipo-bicolor.svg` | **Por defecto.** Eve azul noche + tev eléctrico | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-bicolor.svg` |
| `logotipo-azul-noche.svg` | Una sola tinta, fondo claro | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-azul-noche.svg` |
| `logotipo-blanco.svg` | Fondo oscuro (T2) | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-blanco.svg` |
| `logotipo-teal.svg` | Color heredado | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-teal.svg` |
| `logotipo-negro-minuscula.svg` | Variante "evetev" en minúsculas | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-negro-minuscula.svg` |

**Con razón social** — dicen `Evetev S.A.S.` Para documentación oficial; en producto y marketing va el logotipo normal.

| Archivo | URL |
| :---- | :---- |
| `logotipo-sas-bicolor.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-sas-bicolor.svg` |
| `logotipo-sas-azul-noche.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-sas-azul-noche.svg` |
| `logotipo-sas-blanco.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-sas-blanco.svg` |
| `logotipo-sas-teal.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-sas-teal.svg` |
| `logotipo-sas-negro-minuscula.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/logotipos/logotipo-sas-negro-minuscula.svg` |

### `lockups/` — isotipo \+ logotipo juntos

**Horizontal** para encabezados, membretes y firmas de correo. **Vertical** para portadas, redes y splash.

| Archivo | Cuándo usarlo | URL |
| :---- | :---- | :---- |
| `lockup-horizontal-corporativo.svg` | **Encabezado por defecto** | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-horizontal-corporativo.svg` |
| `lockup-horizontal-negro.svg` | Impresión a una tinta | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-horizontal-negro.svg` |
| `lockup-vertical-corporativo.svg` | **Portada por defecto** | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-vertical-corporativo.svg` |
| `lockup-vertical-negro.svg` | Impresión a una tinta | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-vertical-negro.svg` |
| `lockup-vertical-teal.svg` | Color heredado | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-vertical-teal.svg` |

**Con razón social** — dicen `Evetev S.A.S.`, para contratos, facturas y papelería registral:

| Archivo | URL |
| :---- | :---- |
| `lockup-horizontal-sas-corporativo.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-horizontal-sas-corporativo.svg` |
| `lockup-horizontal-sas-negro.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-horizontal-sas-negro.svg` |
| `lockup-vertical-sas-corporativo.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-vertical-sas-corporativo.svg` |
| `lockup-vertical-sas-negro.svg` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/lockups/lockup-vertical-sas-negro.svg` |

### `favicon/`

| Archivo | Para qué | URL |
| :---- | :---- | :---- |
| `favicon.svg` | Pestaña, por defecto | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon.svg` |
| `favicon-32.png` | Respaldo sin SVG | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon-32.png` |
| `apple-touch-icon.png` | Pantalla de inicio de iOS (180 px, opaco) | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/apple-touch-icon.png` |
| `icon-512.png` | Buscadores y `webmanifest` | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/icon-512.png` |
| `mask-icon.svg` | Pestaña fijada de Safari | `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/mask-icon.svg` |

Juego completo para el `<head>`:

    <link rel="icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="apple-touch-icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/apple-touch-icon.png">
    <link rel="mask-icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/mask-icon.svg" color="#0A2540">
    <meta name="theme-color" content="#0A2540">

### `mascota/`

`mascota.webp` — Eve. Asistente digital, onboarding, estados vacíos. **No usar** en documentos legales, facturas ni en el flujo de pago de EvePay.

### `tokens/`

`colores.css` (variables CSS listas) · `colores.json` (para Tailwind, Figma o scripts).

---

## Reglas de operación

1. **Siempre con versión.** Usa `@1` en producción. Nunca `@latest` ni una URL sin etiqueta: jsDelivr cachea de forma inmutable las versiones etiquetadas.  
2. **Los archivos publicados no se sobreescriben.** Si un logo cambia, se publica una versión nueva (`@2`) y las páginas viejas siguen funcionando.  
3. **Cambios por PR.** Igual que el resto del código: rama corta, PR, una aprobación. Un logo mal cambiado se replica en todos los proyectos al instante.  
4. **SVG externo no se recolorea con CSS** (`fill: currentColor` no cruza la frontera de `<img>`). Por eso existen las variantes de color pre-hechas; si necesitas un color nuevo, se agrega al repo.  
5. **Accesibilidad:** logo informativo → `alt="Evetev"`. Logo decorativo junto a texto que ya dice la marca → `alt=""`.

---

## Para las apps del monorepo `evetev/`

Las aplicaciones internas **no** usan el CDN: importan los SVG como componentes desde `packages/ui` (cero petición de red, tipados, tree-shaking). El CDN es para sitios externos, correos, documentos, prototipos y terceros.

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

https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/...  →  https://assets.evetev.com/...

---

## Licencia

Marcas y logos © Evetev S.A.S. Todos los derechos reservados. Repo público por conveniencia técnica de distribución; **no** implica licencia de uso a terceros.  
