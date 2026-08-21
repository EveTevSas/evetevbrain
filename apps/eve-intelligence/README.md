# @evetev/eve-intelligence

Landing de **Eve Intelligence** — `eveintelligence.evetev.com`. La línea de IA
empresarial: asistentes que responden con la documentación de una empresa.
HTML y CSS planos, sin compilación, igual que `apps/evepay` y
`apps/eveconecta-landing`.

```
apps/eve-intelligence/
├── index.html       # la landing
├── base.css         # GENERADO desde packages/brand/landing/base.css — no editar
├── formularios.js   # GENERADO desde packages/brand/landing/formularios.js — no editar
├── estilos.css      # lo propio de esta landing
├── vercel.json      # estático puro: outputDirectory "."
└── package.json     # se declara landing con "evetev": { "landing": true }
```

## El producto se vende con el producto puesto

La página lleva **el asistente instalado**, apuntando a `fluxi.evetev.com`. Es la
demostración menos discutible que hay: si no funcionara aquí, no habría nada que
ofrecer. Quien llega puede preguntarle algo de Evetev y —más importante—
preguntarle algo que no tenga, para ver que se abstiene en vez de inventar.

Eso obliga a dos cosas al desplegar:

1. **`eveintelligence.evetev.com` tiene que estar en `FLUXI_ORIGENES`** del
   proyecto de Vercel del asistente. Si no, el navegador bloquea la petición y el
   widget se degrada al enlace de contacto **sin que nada se ponga rojo**.
2. Las previews de esta landing ya entran por la regla de previews de
   `src/guardas/entrada.ts`, para que el PR no muestre el asistente roto.

## Marca

- **Violeta** (`--eve-violeta`) como identificador de la línea: chip de portada,
  iconos y numeración de las capas. **Nunca en botones** (regla C3) y nunca como
  texto sobre blanco — ahí va `--eve-violeta-texto` (C7).
- **Coral** solo en el CTA de la portada y en el botón del formulario, que vive
  sobre azul noche. Uno por vista (C2).
- Los tokens del violeta se añadieron a `packages/brand/landing/base.css` en el
  mismo cambio: no estaban, porque hasta ahora ninguna landing los usaba.

### La ilustración está pendiente

La portada va **sin ilustración de escena**. Esta hoja se calcó de la landing de
EvePay y venía con su dibujo de tarjetas y datáfono, que aquí no dice nada: se
quitó.

**No se dibuja a mano.** Las ilustraciones de escena se generan con el prompt del
manual (§4) y se publican en el repositorio de marca; un dibujo programático sale
con todos los ángulos iguales y en una página de producto eso no se lee como
minimalismo. Cuando exista, se enchufa en `estilos.css` con el mismo patrón que
usan las otras dos landings.

## El formulario

Va al mismo buzón que todos: `POST` a `evetev.com/api/contacto`, el único sitio
con la credencial del correo. `data-demo="eveintelligence"` es lo que hace que el
mensaje llegue marcado como Eve Intelligence.

**Añadir un campo es tocar dos sitios.** La tabla `CAMPOS` de `api/contacto.js`
es la única lista blanca: un campo que el marcado mande y no esté ahí **se
descarta en silencio**, con respuesta 200 y sin log. Los de esta landing ya están
registrados: empresa, teléfono, para quién sería, documentación y plazo.

## Correr en local

```bash
pnpm --filter @evetev/eve-intelligence dev   # http://localhost:3006
```

## Desplegar

Proyecto de Vercel aparte, **Root Directory `apps/eve-intelligence`**, dominio
`eveintelligence.evetev.com` con su CNAME en name.com. Sin variables de entorno:
esta landing no tiene secretos.

> La página nace con `noindex`. Quitarlo cuando la oferta esté en firme: una
> página a medias posicionando por «asistente documental» hace más daño que no
> aparecer.
