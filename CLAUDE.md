# evetev — guía para agentes

Mapa de entrada del monorepo. Lo que un agente necesita para trabajar aquí sin
leerse la constitución entera. El detalle vive en `docs/` (enlaces al final);
cuando esta guía y la constitución se contradigan, manda la constitución.

## Qué es cada app (y su estado)

| App                  | Qué es                                                     | Estado                                        | Puerto local |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------- | ------------ |
| `apps/api`           | **EvePay** — plataforma de pagos (NestJS). El producto.    | Activa (aún sin desplegar)                    | 3001         |
| `apps/eveconecta`    | Vertical de propiedad horizontal (Next.js + Supabase)      | **Producción** — conecta.evetev.com           | 3002         |
| `apps/eveledger`     | Operación de estaciones de servicio (Next.js + Prisma)     | **Producción** — `*.vercel.app` (MVP cliente) | 3007         |
| `apps/website`       | evetev.com + landings `/evepay` `/conecta` `/intelligence` | **Producción**                                | —            |
| `apps/rag-assistant` | **Fluxi**, asistente RAG (Kimi + embeddings)               | Producción — `rag-assistant-ochre.vercel.app` | —            |
| `apps/eve-store`     | Tienda (Postgres schema `tienda`)                          | En desarrollo                                 | —            |
| `apps/eve-merchants` | Panel de comercios                                         | En desarrollo                                 | —            |
| `apps/eve-studio`    | Generador con Kimi                                         | Experimental                                  | —            |

Paquetes: `packages/shared` (contrato de EvePay: tipos + Zod), `packages/config`
(eslint/prettier/tsconfig base), `packages/brand` (marca: tokens, logos, patrones
de UI, tono de voz).

## Comandos canónicos

```bash
pnpm lint && pnpm typecheck && pnpm test   # lo que corre CI — verifica ANTES del commit
pnpm format                                # Prettier sobre todo el repo — SIEMPRE antes de commit
pnpm --filter @evetev/<app> dev            # levantar una app
```

Nombres estándar de base de datos en todas las apps (el contenido varía, el
nombre no): `db:start` · `db:generate` · `db:migrate` (producción) ·
`db:migrate:dev` · `db:seed` · `db:reset`.

## Reglas duras (no se negocian)

1. **Secretos jamás al repo.** Ni contraseñas, ni tokens, ni API keys — tampoco
   en la salida de comandos que se pega en PRs. `.env*` está gitignoreado.
2. **`main` está protegida**: todo entra por PR con CI en verde. La protección
   exige solo el check «CI completo».
3. **Las verticales nunca tocan la base de EvePay.** Consumen la API por HTTP
   como un comercio externo. EveConecta solo es dueña del schema `conjuntos`.
4. **Spec obligatoria** (carpeta en `specs/<dominio>/<feature>/` con `spec.md` +
   `plan.md` + `tasks.md`, criterios EARS) para: pagos, ledger, conciliación,
   multi-tenancy, RBAC; y en la vertical: cuotas, aplicación de pagos, mora,
   visibilidad entre roles. En Fluxi, siempre. Lo presentacional va sin spec.
5. **Conventional Commits**, ramas cortas, trunk-based.
6. **No sobre-ingeniar** (§1). No agregar herramientas/paquetes "por si acaso".
7. La marca no se redefine por app: colores y activos salen de `packages/brand`
   (cada app los sirve en `/marca` vía `pnpm marca:sync`).

## Cómo verificar un deploy

Merge a `main` → Vercel despliega solo la app cuya carpeta cambió (el
`ignoreCommand` de cada `vercel.json` cancela el resto). Cada PR genera además
una URL de preview. Verificación por app:

| App          | URL de producción                                   | Criterio de sano                                  |
| ------------ | --------------------------------------------------- | ------------------------------------------------- |
| website      | https://evetev.com                                  | portada carga; `/evepay` `/conecta` responden 200 |
| eveconecta   | https://conecta.evetev.com                          | `/login` carga y renderiza el formulario          |
| eveledger    | URL `*.vercel.app` del proyecto                     | `/login` carga; dashboard tras autenticarse       |
| api (EvePay) | https://api.evetev.com (Railway, aún no desplegada) | `GET /v1/health` → `{"status":"ok"}`              |

Si CI está en rojo en `main`, arreglarlo es la prioridad (§3).

## Trampas conocidas

- **Prettier corre en CI sobre TODO el repo** (incluidos `.md`). Un commit sin
  `pnpm format` es el fallo de CI más frecuente. El hook de pre-commit lo cubre,
  pero no dependas de él si haces commit por fuera.
- ESLint corre con `--max-warnings=0`: una variable sin usar rompe CI.
- Las apps Next usan una versión con breaking changes: lee
  `node_modules/next/dist/docs/` antes de escribir código de framework.
- `next dev` regenera `AGENTS.md`/`next-env.d.ts` dentro de cada app Next; si
  aparecen en el diff, se commitean, no se borran.
- Fechas en EveLedger: todo se guarda como **medianoche UTC**; usa los helpers de
  `src/lib/format.ts`, nunca `new Date(string)` a secas.

## Documentación de fondo

- Constitución: `docs/ESTANDARES_INGENIERIA.md` (la fuente de verdad)
- Vertical: `docs/ESTANDARES_EVECONECTA.md`
- Despliegue paso a paso: `docs/DESPLIEGUE.md`
- Cuentas y servicios: `docs/INFRAESTRUCTURA_Y_CUENTAS.md`
- Specs (SDD): `specs/README.md`
- Cada app tiene su `README.md`; `api`, `eveconecta` y `eveledger` tienen además
  su propio `CLAUDE.md` con el bucle de trabajo local.
