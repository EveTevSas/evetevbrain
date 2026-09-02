@AGENTS.md

# EveLedger — guía para agentes

Next.js + Prisma + Postgres. Operación diaria de estaciones de servicio, **en
producción** para un cliente real. No mueve dinero: lo registra — pero un número
mal calculado aquí es un descuadre en la contabilidad de la estación.

## Bucle de trabajo

```bash
cd apps/eveledger
pnpm db:generate                  # cliente Prisma (también lo corre typecheck)
pnpm db:migrate:dev               # crea/actualiza tablas en el Postgres local
pnpm db:seed                      # admin + datos de ejemplo (SEMILLA_EJEMPLOS=0 los omite)
pnpm dev                          # → http://localhost:3007
pnpm test                         # vitest: las reglas de negocio de src/lib/calc.ts
```

Verificación completa: `pnpm lint && pnpm typecheck && pnpm test`.

## Dónde vive la lógica

- **`src/lib/calc.ts` — funciones puras, la única fuente de las reglas de
  negocio** (ventas, arqueo, inventario teórico, merma, aging FIFO, márgenes).
  Sin dependencias de servidor. **Toda regla nueva entra aquí con su test en
  `calc.test.ts`** — nunca cálculo suelto en un componente o una página.
- `src/lib/{cierres,inventarios,cartera,financiero,dashboard}.ts` — capa de
  servidor: consulta Prisma y delega el cálculo a `calc.ts`.
- `src/lib/format.ts` — formato es-CO y fechas. **Todo se guarda como
  medianoche UTC**: usa `inputAFecha`/`fechaAInput`, nunca `new Date(string)`.

## Reglas de esta app

- El cierre diario solo pasa a CLOSED si la comprobación cuadra **exactamente
  en $0** (`arqueoCuadrado`). No relajar ese cero.
- "No digitado" es `null`, no `0`: un físico en 0 es un tanque vacío; un `null`
  es un dato que falta. Las filas derivadas propagan `null`.
- Su base es un proyecto Supabase **propio** (datos del cliente, no de la
  plataforma). Migrar producción: `db:migrate` con el **session pooler**
  (puerto 5432) — ver `docs/DESPLIEGUE.md` §2 bis.
- CI corre sin `DATABASE_URL` a propósito: todas las rutas son `force-dynamic`.
  Si el build empieza a pedir base, algo se prerenderizó que no debía.
