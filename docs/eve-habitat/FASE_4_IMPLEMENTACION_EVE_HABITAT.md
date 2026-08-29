# Fase 4 — Implementación de Eve-Habitat

**Aplicación:** Eve-Habitat  
**Empresa:** Evetev SAS  
**Fecha de corte:** 18 de julio de 2026  
**Estado:** versión funcional end-to-end para desarrollo, demostración y piloto técnico local

## 1. Resultado

Se implementó un monorepo ejecutable de EvePay + Eve-Habitat siguiendo la
constitución técnica de Evetev. La entrega permite recorrer localmente la cadena
completa cuota → cobro → webhook firmado → ledger de doble partida → aplicación
a cartera, además de operar los principales dominios de propiedad horizontal.

La PWA y la API se encuentran disponibles en:

- Eve-Habitat: <http://localhost:3000>
- acceso demostrativo: <http://localhost:3000/login>
- salud de la API: <http://localhost:4000/health>
- OpenAPI: <http://localhost:4000/docs>
- Supabase local: <http://127.0.0.1:54321>

## 2. Entregables implementados

### Plataforma y experiencia

- PWA Next.js 16 y React 19, responsive y en español;
- navegación diferenciada para escritorio y móvil;
- dashboard operacional con cartera, recaudo, SLA, presupuesto y alertas;
- caché del último snapshot, detección de conectividad y service worker;
- formularios accesibles, modales, notificaciones y estados de carga/error;
- manifest instalable, iconos y soporte de `prefers-reduced-motion`.

### EvePay

- contrato `PaymentProvider` independiente del proveedor;
- adaptadores mock, Wompi y Akua con fallo cerrado sin credenciales;
- onboarding y validación de merchants;
- creación de cobros con idempotencia y protección ante concurrencia;
- verificación HMAC timing-safe, inbox y deduplicación de webhooks;
- máquina de estados de pagos;
- ledger inmutable de doble partida;
- conciliación manual y programada con Inngest;
- evento `payment.approved` consumido idempotentemente por Eve-Habitat.

### Eve-Habitat

- conjuntos, unidades, ocupación y comunidad;
- cuotas, cartera, pagos y conciliación;
- presupuesto, gastos y aprobaciones;
- comunicaciones y evidencia de entrega;
- PQRS e incidencias con prioridad y SLA;
- reservas con prevención de traslapes;
- visitantes, PIN, turnos y sincronización idempotente de portería;
- activos y órdenes de mantenimiento;
- asambleas, quórum y voto único por unidad/pregunta;
- biblioteca documental y auditoría legible;
- solicitudes de titulares y exportación con manifiesto SHA-256.

### Datos y seguridad

- cuatro esquemas PostgreSQL: `identity`, `evepay`, `habitat` y `audit`;
- 33 tablas de tenant con RLS habilitada y forzada;
- política `default deny` y helpers de contexto por JWT/claims;
- restricciones de exclusión para reservas;
- unicidad para idempotencia, webhooks, votos y eventos de portería;
- triggers append-only para ledger y auditoría;
- validación diferida de balance débito = crédito;
- montos enteros en unidad menor y sin manejo de PAN;
- Helmet, CORS explícito, Problem Details y validación Zod;
- exportación reproducible y controles básicos de privacidad.

### Ingeniería y operación

- pnpm workspaces + Turborepo y TypeScript estricto;
- ESLint, Prettier, Vitest, Playwright, axe y pgTAP;
- CI de GitHub Actions, plantilla de PR y Dependabot;
- `.env.example`, diagnóstico de entorno, runbook y guía de arranque;
- 14 capacidades con `spec.md`, `plan.md` y `tasks.md`;
- ocho ADR que documentan las decisiones no reescribibles.

## 3. Evidencia de validación

| Comprobación        | Resultado                                     |
| ------------------- | --------------------------------------------- |
| `pnpm format:check` | aprobado                                      |
| `pnpm lint`         | 7/7 tareas aprobadas, cero warnings           |
| `pnpm typecheck`    | 7/7 tareas aprobadas en modo estricto         |
| `pnpm test`         | 18 pruebas de aplicación aprobadas            |
| `supabase test db`  | 8 pruebas pgTAP aprobadas                     |
| `pnpm build`        | API y 17 rutas Next.js compiladas             |
| `pnpm test:e2e`     | 8/8 recorridos en escritorio y Pixel 7        |
| axe                 | cero hallazgos serios o críticos en dashboard |
| `git diff --check`  | sin errores de espacios o marcadores          |

Los recorridos E2E cubren dashboard, pago y aplicación a cartera, creación de
PQRS, responsive y accesibilidad. Las pruebas de dominio cubren idempotencia,
concurrencia, firmas, balance de ledger, conciliación, aislamiento de tenant,
reservas, sincronización offline, liquidaciones, votos y checksum de exportación.

La revisión visual interactiva cubrió dashboard, Finanzas, Portería, navegación
móvil y consola del navegador. A partir de ella se corrigieron contraste/ARIA y
el apilamiento del buscador de visitantes en pantallas angostas.

## 4. Cómo ejecutar

```bash
./scripts/doctor-env.sh
supabase start --exclude studio,imgproxy,realtime,edge-runtime,logflare,vector,supavisor
supabase db reset
pnpm install
pnpm dev
```

Para instalar el navegador de pruebas por primera vez:

```bash
pnpm --filter @eve-habitat/web exec playwright install chromium
```

## 5. Frontera entre esta entrega y producción

Esta entrega es funcional y reproducible en sandbox local. No se afirma que esté
certificada para mover dinero real ni desplegada en producción. Antes del piloto
con fondos o PII reales deben completarse estas puertas externas:

1. crear proyectos remotos separados de Supabase y configurar Auth/MFA;
2. sustituir el repositorio determinístico de demostración por persistencia
   transaccional PostgreSQL en todos los casos de uso de la API;
3. obtener credenciales, URLs vigentes y certificación sandbox de Wompi/Akua;
4. configurar secretos, Sentry, PostHog, dominio, TLS y políticas de retención;
5. ejecutar revisión legal colombiana, pentest y simulacro de recuperación;
6. desplegar previews y producción en las cuentas de Vercel/Railway/Supabase;
7. validar el piloto con una administradora, un residente y personal de portería.

Estas acciones requieren cuentas, credenciales, decisiones legales o aprobación
de terceros y no deben automatizarse con valores inventados.

## 6. Limitación local de Computadora

El complemento Computadora detectó Google Chrome, pero macOS no concedió estado
ni acciones de accesibilidad durante la validación. Se intentó de forma acotada
en Chrome y Codex. La revisión equivalente se completó con el navegador integrado
y Playwright, incluyendo capturas responsive y verificación de consola sin
errores. Para futuras sesiones de Computadora debe habilitarse Codex en
**Configuración del Sistema → Privacidad y seguridad → Accesibilidad**.
