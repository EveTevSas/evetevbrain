# @evetev/website

**evetev.com** — sitio corporativo / marketing. Estático (HTML + CSS + assets),
se despliega en **Vercel** (§10).

```
index.html      # la landing
files/          # css2 (fuentes), videos de fondo, mascota, imagen de portada
```

## Correr en local

```bash
pnpm --filter @evetev/website dev   # http://localhost:3002
```

> Importado de un prototipo (Netlify). Rutas de assets alineadas a `./files/` y
> enlaces del dominio de origen vueltos relativos. Pendiente opcional: favicon
> propio (hoy referencia `favicon.svg` relativo, aún no incluido).
