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
