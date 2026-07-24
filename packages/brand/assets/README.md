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

| Archivo | Cuándo usarlo |
| :---- | :---- |
| `isotipo-azul-noche.svg` | Fondos claros. **Uso por defecto.** |
| `isotipo-blanco.svg` | Fondos oscuros o fotografía con velo |
| `isotipo-cian.svg` | Sobre azul noche |
| `isotipo-teal.svg` | Color heredado del original |
| `isotipo-gradiente-corporativo.svg` | Hero, portadas, piezas expresivas |
| `isotipo-gradiente-ia.svg` | Piezas de Eve Intelligence |
| `isotipo-gradiente-azul-cian.svg` | Degradado corto, usos pequeños |

### `unidades/` — media unidad, ícono de línea de producto

`unidad-izquierda-{negro,degradado}.svg` · `unidad-derecha-{negro,degradado}.svg` Identifican productos (EvePay, Eve Intelligence, Tienda). **Nunca sustituyen al isotipo completo en la marca principal.**

### `logotipos/` — la palabra "Evetev" (Baloo 2 en contornos)

`logotipo-bicolor.svg` (Eve azul noche \+ tev eléctrico) · `logotipo-azul-noche.svg` · `logotipo-teal.svg` · `logotipo-blanco.svg` · `logotipo-negro-minuscula.svg` (variante "evetev" todo en minúsculas)

### `lockups/` — isotipo \+ logotipo juntos

Vertical (`-corporativo`, `-teal`, `-negro`) para portadas y redes. Horizontal (`-corporativo`, `-negro`) para encabezados, membretes y firmas de correo.

### `favicon/`

`favicon.svg` (moderno) · `favicon-32.png` (respaldo) · `apple-touch-icon.png` (180px, iOS).

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
