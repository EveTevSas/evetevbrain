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

patrones/
└── login/                        # patrón de login (ver abajo)
    ├── README.md                  # tokens, anatomía, checklist
    ├── soft-pastel-blend.tsx      # componente de fondo (copiable)
    └── login-page.tsx             # plantilla completa (copiable)
```

## `patrones/login/` — patrón de pantalla de inicio de sesión

Guía de referencia para construir el login de cualquier app Evetev.
Incluye tokens, anatomía visual, el componente de fondo `GradientBackground`
y una plantilla de página lista para copiar y adaptar.

Aplicado en: **EveLedger** · **EveConecta**

Ver [`patrones/login/README.md`](./patrones/login/README.md) para la guía completa.

---

Los tokens de color (`colores.json`, `tokens/`) son la marca en forma de datos.
Cuando exista `packages/ui` (design system), consumirá estos tokens — no se
redefinen colores por app (§8: "ninguna app define colores propios").

> Importado del repo `Evetev-Dev/brand`. Consolidado al monorepo para versionar
> la marca junto al código que la usa.

## `landing/` — lo que comparten las landings de producto

**Fuente única** de los dos archivos que comparten las landings estáticas de
producto. Desde que las tres son rutas del sitio corporativo
(`evetev.com/evepay`, `/conecta`, `/intelligence`) comparten un solo par de
copias, servido en `apps/website/landings/`:

| Archivo                  | Qué es                                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `landing/base.css`       | el armazón: respaldo de tokens, reset, tipografía, contenedor, isotipo teñido, nav, botones, portada, **formulario de demo** y pie |
| `landing/formularios.js` | el envío del formulario de demo al endpoint de `evetev.com`                                                                        |

No se sirven por CDN como `assets/`: son internos del monorepo, y publicarlos
obligaría a etiquetar una versión del repo de marca por cada ajuste. Se copian
al sitio con un script y el CI vigila que la copia no se desvíe.

```bash
pnpm landings:sync      # copia las fuentes a apps/website/landings/
pnpm landings:check     # lo que corre el CI: falla si la copia se desvió
```

**Una landing nueva** no tiene que sincronizar nada: se crea como una carpeta
más de `apps/website/` —esa carpeta es su ruta pública— y enlaza los archivos ya
copiados, con rutas absolutas para que funcionen igual con `/ruta` que con
`/ruta/`:

```html
<link rel="stylesheet" href="/landings/base.css" />
<link rel="stylesheet" href="/mi-producto/estilos.css" />
<script src="/landings/formularios.js" defer></script>
```

### El formulario de demo

`formularios.js` no lleva nada específico de un producto: lee el marcado. Una
landing solo escribe HTML —el contrato está comentado al principio del archivo—
y el producto sale de un atributo:

```html
<form class="demo-form" data-demo="evepay"><!-- o "eveconecta" --></form>
```

Ese `data-demo` es lo que hace que el correo llegue marcado como EvePay o
EveConecta. La clave debe existir en la lista blanca de
`apps/website/api/contacto.js`; una que no esté ahí se ignora y el correo sale
sin rótulo, nunca con uno inventado por el cliente.

Lo mismo vale para **cada campo**: el script reenvía todos los `name=` del
formulario, pero el endpoint solo limpia e imprime los que estén en su tabla
`CAMPOS`, y descarta el resto **sin avisar** (`200`, sin error). Un campo nuevo
en una landing es siempre dos cambios: el marcado y esa tabla.
