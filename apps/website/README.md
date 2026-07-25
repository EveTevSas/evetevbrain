# @evetev/website

**evetev.com** — sitio corporativo / marketing. Estático (HTML + CSS + assets),
se despliega en **Vercel** (§10).

```
index.html      # la landing (HTML + CSS embebido + JS embebido)
files/          # video de fondo e imagen de portada
```

## Marca

El sitio sigue `packages/brand/assets/evetev_brand_styles.md` (v1.0):

- **Activos de marca SIEMPRE desde el CDN** (regla T1):
  `https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/...` — isotipos, unidades,
  favicon y mascota. No se guardan copias locales ni se dibujan a mano.
- **Tokens**: se importan de `…/tokens/colores.css` con respaldo local en `:root`.
- **Coral `#EE3D22`**: exclusivo del CTA global del nav (único por vista, C2).
  El resto de acciones usa `.btn-sec` (mezclado `#144A96`) o `.btn-ghost`.
- Tipografías: Baloo 2 (titulares/cifras), Inter (UI), JetBrains Mono (código).

`files/` solo conserva lo que no es activo de marca: el video
`evepay-background.mp4` y su poster `portada-red.jpg`.

## Correr en local

```bash
pnpm --filter @evetev/website dev   # http://localhost:3002
```

> Requiere conexión a internet para el CDN de marca (jsDelivr) y Google Fonts.
