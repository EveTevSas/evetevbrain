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

## `landing/` — lo que comparten las landings de producto

**Fuente única** de los dos archivos que llevan idénticos todas las landings
estáticas (`apps/evepay`, `apps/eveconecta-landing`, y las que vengan):

| Archivo | Qué es |
|---|---|
| `landing/base.css` | el armazón: respaldo de tokens, reset, tipografía, contenedor, isotipo teñido, nav, botones, portada, **formulario de demo** y pie |
| `landing/formularios.js` | el envío del formulario de demo al endpoint de `evetev.com` |

No se sirven por CDN como `assets/`: son internos del monorepo, y publicarlos
obligaría a etiquetar una versión del repo de marca por cada ajuste. Se replican
a cada landing con un script y el CI vigila que las copias no se desvíen.

```bash
pnpm landings:sync      # replica las fuentes en cada landing
pnpm landings:check     # lo que corre el CI: falla si alguna se desvió
```

**Para apuntar una landing nueva**, en su `package.json`:

```json
"evetev": { "landing": true }
```

y `pnpm landings:sync`. No hay que tocar el script.

### El formulario de demo

`formularios.js` no lleva nada específico de un producto: lee el marcado. Una
landing solo escribe HTML —el contrato está comentado al principio del archivo—
y el producto sale de un atributo:

```html
<form class="demo-form" data-demo="evepay">   <!-- o "eveconecta" -->
```

Ese `data-demo` es lo que hace que el correo llegue marcado como EvePay o
EveConecta. La clave debe existir en la lista blanca de
`apps/website/api/contacto.js`; una que no esté ahí se ignora y el correo sale
sin rótulo, nunca con uno inventado por el cliente.
