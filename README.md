# evetev

Monorepo de **Evetev SAS**. Nuestro producto es **EvePay**, la plataforma de pagos
(PSP/gateway sobre Akua). El **dashboard de conjuntos residenciales** es su primera
vertical: la cuña con la que validamos la plataforma cobrando dinero real.

No todo lo que vive aquí cuelga de EvePay: **EveLedger** (`apps/eveledger`) es
software de operación para estaciones de servicio y no mueve dinero, lo registra.
Comparte marca, CI y despliegue; no la plataforma de pagos.

> La fuente de verdad de cómo trabajamos es la constitución:
> [`docs/ESTANDARES_INGENIERIA.md`](docs/ESTANDARES_INGENIERIA.md).
> Estándares de la vertical: [`docs/ESTANDARES_EVECONECTA.md`](docs/ESTANDARES_EVECONECTA.md).
> Servicios y cuentas del stack: [`docs/INFRAESTRUCTURA_Y_CUENTAS.md`](docs/INFRAESTRUCTURA_Y_CUENTAS.md).
> Cómo desplegar (Vercel + DNS): [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).
> Plan de desarrollo de EvePay (SDD + Akua): [`docs/PLAN_DESARROLLO_EVEPAY.md`](docs/PLAN_DESARROLLO_EVEPAY.md).
> Plan del asistente RAG (Fluxi): [`docs/PLAN_ASISTENTE_FLUXI.md`](docs/PLAN_ASISTENTE_FLUXI.md).
> Implantar el asistente en un cliente: [`docs/PLAYBOOK_ASISTENTE_RAG.md`](docs/PLAYBOOK_ASISTENTE_RAG.md) · [`docs/MODELO_DE_NEGOCIO_ASISTENTE.md`](docs/MODELO_DE_NEGOCIO_ASISTENTE.md).

## Estructura (arranque mínimo, §8)

```
apps/
├── api/            # EvePay — el núcleo de pagos (NestJS). No conoce el dominio de la vertical.
├── eveconecta/     # EveConecta (Next.js): aplicación de propiedad horizontal.
├── eveledger/      # EveLedger (Next.js): operación diaria de estaciones de servicio.
└── website/        # evetev.com — sitio corporativo / marketing (estático, Vercel).
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
pnpm --filter @evetev/eveconecta dev   # EveConecta  → http://localhost:3002
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

## Despliegue: cada app se construye sola

Una decena de proyectos de Vercel apuntan a este repositorio —y el número solo
sube—, y por defecto **todos** reconstruían en cada push, tocara lo que tocara el
commit. Un cambio de una línea
en una landing gastaba seis despliegues, y cada PR los cuenta dos veces —preview
y merge—. Un día de trabajo normal agotó el tope diario del plan Hobby: los
builds empezaron a fallar con `upgradeToPro=build-rate-limit`, y con ellos dejó
de salir la preview de los PR y de actualizarse producción, sin que nada en el
repositorio pareciera roto.

Por eso cada app lleva `ignoreCommand` en su `vercel.json`:

```json
"ignoreCommand": "git rev-parse HEAD^ >/dev/null 2>&1 || exit 1; git diff --quiet HEAD^ HEAD -- ."
```

Con el Root Directory que cada proyecto ya tiene, ese `.` es su propia carpeta:
si el commit no la tocó, Vercel cancela antes de construir y no consume cupo.

Dos detalles que no son arbitrarios:

- **Si no se puede averiguar el commit anterior, se construye.** Vercel clona en
  superficie y `HEAD^` puede no existir; por eso la guarda sale con `exit 1`.
  Ante la duda se despliega: saltarse un build por error deja producción vieja en
  silencio, que es exactamente el fallo que esto viene a evitar.
- **Las apps de Next añaden `../../pnpm-lock.yaml`** a las rutas vigiladas. Una
  subida de dependencia cambia lo que se despliega sin tocar su carpeta. Las
  landings estáticas y `eve-studio` no lo necesitan: no instalan nada del
  workspace.

Nota sobre la cuota: el plan es Hobby, con **100 builds en una ventana móvil de
24 horas**, y cada PR cuenta doble (preview y merge). El `ignoreCommand` es lo
que hace que añadir una app séptima no multiplique el gasto: solo construye la
que cambió.

## Contribuir

Trunk-based, ramas cortas, PR pequeño con **1 aprobación** y **CI en verde**.
Conventional Commits. Guía en [`CONTRIBUTING.md`](CONTRIBUTING.md) (incluye la
identidad de commits: `./scripts/setup-git.sh`). Todo el detalle en la
constitución (§3, §8, §9).
