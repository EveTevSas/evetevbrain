# evetev

Monorepo de **Evetev SAS**. Nuestro producto es **EvePay**, la plataforma de pagos
(PSP/gateway sobre Akua). El **dashboard de conjuntos residenciales** es su primera
vertical: la cuña con la que validamos la plataforma cobrando dinero real.

> La fuente de verdad de cómo trabajamos es la constitución:
> [`docs/ESTANDARES_INGENIERIA.md`](docs/ESTANDARES_INGENIERIA.md).
> Servicios y cuentas del stack: [`docs/INFRAESTRUCTURA_Y_CUENTAS.md`](docs/INFRAESTRUCTURA_Y_CUENTAS.md).

## Estructura (arranque mínimo, §8)

```
apps/
├── api/            # EvePay — el núcleo de pagos (NestJS). No conoce el dominio de la vertical.
└── eve-habitat/    # 1.ª vertical (Next.js): front + su backend de dominio. Consume EvePay por HTTP.
packages/
├── shared/         # contrato de EvePay: tipos + esquemas Zod
├── config/         # eslint · prettier · tsconfig base
└── brand/          # identidad de marca (logos, isotipos, tokens)
docs/               # constitución + assets
.github/            # CI (lint · typecheck · test) + plantilla de PR
```

El árbol completo del destino (más apps y paquetes) vive en `docs/`. Se agrega
**cuando el dolor aparezca**, no por anticipado (§1, §8). Turborepo, `packages/ui`
y `evepay-sdk` todavía **no** se montan.

## Requisitos

- **Node 22** (`.nvmrc`) · **pnpm 9+** (vía Corepack: `corepack enable`)

## Arrancar (< 15 min)

```bash
corepack enable
pnpm install
cp .env.example .env        # completa valores; en local PAYMENT_PROVIDER=fake

pnpm --filter @evetev/api dev          # EvePay API  → http://localhost:3001
pnpm --filter @evetev/eve-habitat dev  # Eve-Habitat → http://localhost:3000
```

Calidad (lo que corre CI):

```bash
pnpm lint && pnpm typecheck && pnpm test
```

## Principios que no se rediscuten (§1)

1. Vendemos **EvePay**, no un dashboard. La vertical lo valida.
2. **AI-native = datos limpios** (todo queda como evento), no chatbots.
3. **Monolito modular**, no microservicios.
4. **API-first y event-logged**: las verticales consumen la plataforma como un
   comercio externo (dogfooding); nunca tocan su base de datos.
5. **No sobre-ingeniar.**
6. Cimientos no-reescribibles desde el primer commit: **multi-tenant** +
   **idempotencia/auditoría/conciliación** de pagos.

## Contribuir

Trunk-based, ramas cortas, PR pequeño con **1 aprobación** y **CI en verde**.
Conventional Commits. Todo el detalle en la constitución (§3, §8, §9).
