# EvePay API — guía para agentes

NestJS, monolito modular. **El núcleo de pagos: aquí los errores cuestan dinero.**

## Bucle de trabajo

```bash
pnpm --filter @evetev/shared build   # primero: la API depende del contrato
pnpm --filter @evetev/api dev        # nest start --watch → http://localhost:3001
pnpm --filter @evetev/api test       # tests unitarios
pnpm --filter @evetev/api lint && pnpm --filter @evetev/api typecheck
```

Prueba rápida: `GET http://localhost:3001/v1/health` → `{"status":"ok","service":"evepay-api"}`.
`POST /v1/pagos` exige header `Idempotency-Key`.

## Reglas de esta app

- **No conoce el dominio de las verticales**: no sabe qué es una "cuota" ni un
  "residente". Si un cambio necesita ese concepto aquí, el diseño está mal.
- Todo pago pasa por la interfaz `PaymentProvider` (contrato en
  `@evetev/shared`). Local/CI usan `FakePaymentProvider`
  (`PAYMENT_PROVIDER=fake`); Akua es la implementación real.
- Cambios en pagos, ledger, conciliación, multi-tenancy o RBAC exigen **spec
  previa** en `specs/evepay/<feature>/` (EARS) y sus tests.
- La base usa el rol `evepay_api` con RLS: nunca owner, nunca BYPASSRLS.
- El ledger es **inmutable**: los movimientos no se editan ni borran, se
  compensan con movimientos nuevos.

## Base de datos

`db:generate` (cliente Prisma) · `db:push` (solo desarrollo). Migraciones y
despliegue en Railway: ver `docs/DESPLIEGUE.md` §5.
