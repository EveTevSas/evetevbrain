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
:root{
  /* Base */
  --eve-azul-noche:#0A2540;          /* texto principal, fondos de peso, footer */
  --eve-azul-noche-profundo:#081D33; /* fondo de modo oscuro (NUNCA negro puro) */
  --eve-hielo:#EAF2FB;               /* superficies claras, tarjetas */
  --eve-tinte:#F4F9FD;               /* secciones alternas suaves */
  --eve-linea:#EDF3FA;               /* bordes y divisores */
  --eve-pizarra:#64748B;             /* texto secundario */
  --eve-muted:#94A3B8;               /* metadatos, placeholders */
  --eve-blanco:#FDFEFF;              /* fondo de página */

  /* Acción */
  --eve-coral:#EE3D22;               /* CTA primario — EXCLUSIVO */
  --eve-coral-hover:#CF3016;

  /* Azules funcionales */
  --eve-electrico:#1E6FEB;           /* enlaces, anillo de foco */
  --eve-mezclado:#144A96;            /* secundario: botones 2os, sliders, switches, gráficos */
  --eve-cian:#22D3EE;                /* realce sobre fondos oscuros */
  --eve-teal:#3BAEC2;                /* ilustración, línea Tienda */

  /* Violeta Eve — línea Eve Intelligence */
  --eve-violeta:#8B5CF6;
  --eve-violeta-texto:#6D28D9;
  --eve-violeta-tinte:#EDE9FE;

  /* Semánticos */
  --eve-exito:#16A34A;
  --eve-alerta:#D97706;
  --eve-error:#B91C1C;
}
```

**Atajo:** puedes importar los tokens en vez de copiarlos:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/tokens/colores.css">
```

### Reglas de color (obligatorias)

| # | Regla |
|---|---|
| C1 | **Proporción 60/20/10/5/5**: 60% superficies claras · 20% azul noche · 10% azules funcionales · 5% coral · 5% cian/teal/violeta. |
| C2 | **El coral es exclusivo de acciones.** Máximo **un botón coral por pantalla/vista**. PROHIBIDO usar coral en fondos grandes, textos largos, bordes decorativos o iconografía. |
| C3 | **El violeta nunca va en botones.** Solo identifica Eve Intelligence: iconos, chips, ilustración, degradado IA. |
| C4 | **Modo oscuro sobre `#081D33`**, jamás negro puro (`#000`). |
| C5 | **Errores siempre con ícono + texto**, nunca comunicados solo por color (el coral de acción y el rojo de error deben distinguirse). |
| C6 | **Degradados solo en piezas expresivas** (hero, portadas, isotipo). PROHIBIDO en botones, texto o componentes funcionales. |
| C7 | Cian y violeta base **nunca como texto sobre fondo blanco** (contraste insuficiente). Usa `--eve-violeta-texto` o azul noche. |

### Degradados

```css
--eve-grad-corporativo: linear-gradient(90deg,#0A2540 0%,#1E6FEB 55%,#22D3EE 100%);
--eve-grad-ia:          linear-gradient(90deg,#8B5CF6 0%,#6366F1 50%,#22D3EE 100%);
```

---

## 3. Tipografía

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600&display=swap">
```

| Familia | Rol | Pesos | Dónde |
|---|---|---|---|
| **Baloo 2** | Marca y titulares | 600, 700 | Logotipo, `h1`–`h2`, cifras protagonistas (montos, métricas) |
| **Inter** | Producto y cuerpo | 400, 500, 600 | Toda la UI: párrafos, botones, formularios, tablas, navegación |
| **JetBrains Mono** | Técnico | 400, 500 | Código, referencias de transacción, documentación de API |

```css
h1,h2,.brand{font-family:'Baloo 2',sans-serif;font-weight:600}
body{font-family:'Inter',sans-serif;line-height:1.65;color:#0A2540}
```

**Escala fluida (usar `clamp` siempre):**
```css
h1{font-size:clamp(1.9rem,4.6vw,2.6rem);line-height:1.16}
h2{font-size:clamp(1.3rem,2.6vw,1.6rem)}
p {font-size:clamp(.9rem,1.6vw,.98rem)}
small{font-size:.82rem}
```

Nunca menos de 12 px. Máximo dos familias visibles por pieza (la mono solo en contexto técnico).

---

## 4. Activos de marca (CDN — NO generar logos a mano)

**REGLA T1 — PROHIBIDO dibujar, recrear o aproximar el logo de Evetev.** Siempre referenciar por URL del CDN.

**Patrón de URL:** `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/RUTA`

### Isotipo (el símbolo: dos rombos entrelazados)
| Archivo | Cuándo |
|---|---|
| `isotipos/isotipo-azul-noche.svg` | **Por defecto**, sobre fondos claros |
| `isotipos/isotipo-blanco.svg` | Fondos oscuros o fotografía |
| `isotipos/isotipo-cian.svg` | Sobre azul noche |
| `isotipos/isotipo-teal.svg` | Color heredado |
| `isotipos/isotipo-gradiente-corporativo.svg` | Hero, portadas, piezas expresivas |
| `isotipos/isotipo-gradiente-ia.svg` | Piezas de Eve Intelligence |

### Unidades (media unidad = ícono de línea de producto)
`unidades/unidad-izquierda-negro.svg` · `unidad-izquierda-degradado.svg` · `unidad-derecha-negro.svg` · `unidad-derecha-degradado.svg`

Se usan como **iconos de producto** (EvePay, Eve Intelligence, Tienda). Tamaño recomendado: 30–34 px.
PROHIBIDO usarlas como marca principal o reemplazo del isotipo completo.

### Logotipo y lockups
- `logotipos/logotipo-bicolor.svg` (Eve azul noche + tev eléctrico), `-azul-noche`, `-teal`, `-blanco`, `-negro-minuscula`
- `lockups/lockup-horizontal-negro.svg` · `-corporativo` → encabezados, membretes, firmas de correo
- `lockups/lockup-vertical-negro.svg` · `-corporativo` · `-teal` → portadas, redes, app

### Favicon y mascota
```html
<link rel="icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/apple-touch-icon.png">
<meta name="theme-color" content="#0A2540">
```
Mascota: `mascota/mascota.webp`. **PROHIBIDA** en documentos legales, facturas, contratos y en el flujo de pago de EvePay.

### Snippet de logo en encabezado
```html
<a class="logo" href="/" aria-label="Evetev inicio">
  <img src="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/isotipos/isotipo-azul-noche.svg"
       alt="" width="32" height="23">
  <span class="brand">Evetev</span>
</a>
```
Accesibilidad: si el texto "Evetev" acompaña al logo, la imagen es decorativa → `alt=""`.
Si el logo va solo, `alt="Evetev"`.

---

## 5. Forma, espacio y movimiento

```css
/* Radios */
--r-sm:8px;    /* inputs, chips */
--r-md:12px;   /* tarjetas, modales */
--r-lg:16px;   /* contenedores hero */
--r-pill:999px;/* botones y badges — SIEMPRE pill */
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
.btn{border-radius:999px;font-weight:600;font-size:.85rem;padding:11px 24px;
     transition:.15s;border:none;cursor:pointer;font-family:'Inter',sans-serif}
.btn-cta{background:var(--eve-coral);color:#fff}          /* primario — uno por vista */
.btn-cta:hover{background:var(--eve-coral-hover)}
.btn-sec{background:var(--eve-mezclado);color:#fff}       /* secundario */
.btn-ghost{background:none;border:1px solid #D7E3F0;color:var(--eve-azul-noche);font-weight:500}
```
Jerarquía: **coral** (acción principal) → **mezclado** (secundaria) → **ghost** (terciaria) → **enlace** (`color:var(--eve-electrico)`).

### Tarjetas
```css
.card{background:#fff;border:1px solid var(--eve-linea);border-radius:14px;overflow:hidden;transition:.2s}
.card:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(10,37,64,.09)}
.card .cuerpo{padding:18px 22px 22px}
.card h3{font-size:.95rem;font-weight:600;margin-bottom:5px}
.card p{font-size:.82rem;color:var(--eve-pizarra)}
```
Variante minimalista (preferida en listados de servicios): sin fondo ni sombra, separadas por
`border-right:1px solid var(--eve-linea)` en grilla.

### Navegación
```css
nav{position:sticky;top:0;background:rgba(253,254,255,.95);backdrop-filter:blur(8px);
    border-bottom:1px solid var(--eve-linea);z-index:50}
.nav-in{display:flex;align-items:center;justify-content:space-between;height:60px}
.menu{display:flex;gap:26px;font-size:.85rem;color:var(--eve-pizarra)}
```
Móvil (≤760px): menú hamburguesa de 3 líneas (20×2 px, gap 4 px), panel desplegable a ancho completo.

### Formularios
```css
label{display:block;font-size:.82rem;font-weight:500;margin-bottom:6px}
input,select,textarea{width:100%;padding:11px 14px;border:1px solid #DCE7F2;border-radius:9px;
       font-size:.88rem;font-family:'Inter';background:#fff;color:var(--eve-azul-noche)}
input:focus{outline:2px solid var(--eve-electrico);border-color:transparent}
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
/* Tablet */   @media(max-width:1024px){ /* grillas 3 → 2 columnas */ }
/* Móvil */    @media(max-width:760px){  /* 1 columna · hamburguesa · botones a ancho completo · padding 26px */ }
/* Amplio */   @media(min-width:1440px){ .wrap{max-width:1160px} }
/* Ultra-wide */ @media(min-width:1900px){ html{font-size:17.5px} .wrap{max-width:1280px} }
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
- Ejemplos de la voz correcta: *"Pagos e inteligencia artificial, sin complicaciones"* · *"Tarifas transparentes. Tecnología propia. Cero letra menuda."* · *"Construido por ingenieros."*

**Dato de negocio:** EvePay cobra **un porcentaje por transacción más un componente fijo**, más suscripción
mensual del software. NUNCA escribir "tarifa fija sin porcentaje" (información obsoleta).

---

## 10. Checklist de autoverificación (ejecutar antes de entregar)

Antes de devolver cualquier artefacto, confirma:

- [ ] ¿Usé las URLs del CDN para el logo, sin dibujarlo a mano?
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
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Evetev — [título]</title>
<link rel="icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#0A2540">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/tokens/colores.css">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;color:var(--eve-azul-noche);background:#FDFEFF;line-height:1.65}
h1,h2{font-family:'Baloo 2',sans-serif;font-weight:600}
.wrap{max-width:1040px;margin:0 auto;padding:0 clamp(24px,4.5vw,32px)}
.btn{border-radius:999px;font-weight:600;font-size:.85rem;padding:11px 24px;border:none;cursor:pointer;transition:.15s}
.btn-cta{background:var(--eve-coral);color:#fff}
.btn-cta:hover{background:var(--eve-coral-hover)}
:focus-visible{outline:2px solid var(--eve-electrico);outline-offset:2px}
@media(max-width:760px){.wrap{padding:0 26px}}
@media(min-width:1900px){html{font-size:17.5px}.wrap{max-width:1280px}}
</style>
</head>
<body>
<!-- contenido -->
</body>
</html>
```

---

## 12. Referencia rápida (tabla de decisión)

| Necesito… | Uso |
|---|---|
| Botón de acción principal | `--eve-coral`, pill, uno por vista |
| Botón secundario | `--eve-mezclado` |
| Enlace de texto | `--eve-electrico` |
| Fondo de sección alterna | `--eve-tinte` o `--eve-hielo` |
| Sección de peso / footer | `--eve-azul-noche` |
| Identificar EvePay | azul eléctrico + unidad izquierda |
| Identificar Eve Intelligence | violeta + unidad derecha |
| Identificar Tienda | teal + unidad izquierda |
| Titular grande | Baloo 2 600, `clamp(1.9rem,4.6vw,2.6rem)` |
| Cifra o monto destacado | Baloo 2 700 |
| Texto de interfaz | Inter 400/500 |
| Ícono de producto | unidad SVG del CDN, 30–34 px |
| Marca en encabezado | isotipo azul noche 32 px + "Evetev" en Baloo 600 |
