# @evetev/config

Config compartida de calidad para todo el monorepo (§8 de la constitución).

- `eslint.config.mjs` — base flat config de ESLint 9 (TS estricto).
- `prettier.config.mjs` — estilo único; no se discute en reviews.
- `tsconfig.base.json` — base de TypeScript (`strict: true`) que extienden apps y paquetes.

Cada app/paquete extiende la base con:

```jsonc
// tsconfig.json
{ "extends": "../../packages/config/tsconfig.base.json" }
```
