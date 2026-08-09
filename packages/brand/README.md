# @evetev/brand

Identidad de marca de Evetev: **fuente de verdad** de logos, isotipos, favicon,
mascota y tokens de color.

```
assets/
├── colores.css / colores.json   # tokens de color
├── tokens/                       # tokens exportables
├── logotipos/ · isotipos/ · lockups/
├── favicon/ · mascota/ · unidades/
└── evetev_brand_styles.md        # guía de uso de marca
```

Los tokens de color (`colores.json`, `tokens/`) son la marca en forma de datos.
Cuando exista `packages/ui` (design system), consumirá estos tokens — no se
redefinen colores por app (§8: "ninguna app define colores propios").

> Importado del repo `Evetev-Dev/brand`. Consolidado al monorepo para versionar
> la marca junto al código que la usa.

## `landing/` — base de CSS de las landings de producto

`landing/base.css` es la **fuente única** del armazón que comparten las landings
estáticas (`apps/evepay`, `apps/eveconecta-landing`, y las que vengan): respaldo
de tokens, reset, tipografía, contenedor, isotipo teñido, nav, botones, portada
y pie.

No se sirve por CDN como `assets/`: es CSS interno del monorepo, y publicarlo
obligaría a etiquetar una versión del repo de marca por cada ajuste. Se replica
a cada landing con un script y el CI vigila que las copias no se desvíen.

```bash
pnpm css:sync      # replica la fuente en cada landing
pnpm css:check     # lo que corre el CI: falla si alguna se desvió
```

**Para apuntar una landing nueva**, en su `package.json`:

```json
"evetev": { "landing": true }
```

y `pnpm css:sync`. No hay que tocar el script.
