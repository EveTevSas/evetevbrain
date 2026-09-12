# Bitácora de EvePay

Registro por sesión de trabajo: qué se hizo, qué se decidió y qué quedó
pendiente. Complementa `PLAN_DESARROLLO_EVEPAY.md` (el plan) y las specs en
`specs/evepay/` (el detalle). Lo más reciente arriba.

---

## 11-sep-2026 (tarde) — Nace `apps/hub`, la torre de control de la compañía

**Rama:** `feat/hub`, encima de `feat/evepay-comisiones` (el Hub lee
`/v1/admin/resumen`, que nació allí). **Insumo:** prototipo
`evetev-hub-prototipo.html` y `ARQUITECTURA_HUB_EVETEV.md` de la fundadora;
el §8 del documento decía «hoy NO construir el Hub» y ella decidió adelantarlo,
así que se montó **delgado**.

**Decisiones (confirmadas con la fundadora):**

- **Supabase de EvePay** para identidad (Google), opción (a) del documento:
  una cuenta por persona; el Hub llama a EvePay con el JWT de quien navega.
- **Entra cualquier cuenta de Google del dominio `evetev.com`**
  (`HUB_DOMINIOS_PERMITIDOS`), más quien ya tenga rol interno de EvePay.
- **Cuenta canónica en el Hub** (`hub.cuentas`, `hub.enlaces_producto`),
  contrato en `@evetev/shared/cuenta-canonica.ts`. EvePay no la conoce.
- Datos propios en el schema `hub` con el rol `hub_app`, que **no tiene
  GRANT** sobre `evepay`/`identity`/`audit` (probado: permission denied). Sin
  ORM. Migración `0024_hub.sql` en `apps/api/supabase/migrations/` porque es
  un solo proyecto Supabase y una sola historia de migraciones.
- Nombres reales del repo en lugar de los del documento: `evepay-admin`,
  `eveconecta`, `eveledger`; no existe `evepay-sdk`, se usa la API admin.

**Qué quedó:** spec `specs/hub/hub-base` (CA-1…CA-8, todas cubiertas);
Google en `config.toml` (secretos por `env`, apagado sin ellos; en local se
entra con correo); `apps/hub` en :3005 con proxy de acceso, login con Google,
callback OAuth, menú Compañía · Negocio · Interno y las ocho vistas: Global,
Portales & accesos, Productos, Clientes (unificado), Ingresos & costos, Salud
financiera, Equipo & metas, Documentos (con auditoría del Hub). Todo lo
editable va por server actions con Zod + auditoría (CA-7). Lo que no se puede
calcular con datos reales dice «sin datos» (churn, NRR, CAC…). CI: área y job
`hub`. Verificado: shared 76 tests, hub 4, lint/typecheck/build en verde; las
nueve rutas renderizan con una sesión real y el roll-up de EvePay llega.

**Pendiente:** credenciales OAuth de Google (Google Cloud → Supabase),
proyecto Vercel para `apps/hub`, crear `hub_app` en el Supabase alojado y
aplicar 0024, registrar costos y cierre del mes reales, MRR de EveConecta y
EveLedger por API cuando exista.

---

## 11-sep-2026 — Fases 6 a 11 y rediseño de la consola

**Rama:** `feat/evepay-comisiones` (desde `main`, 20 commits, sin push al
cierre de la sesión). **Alcance:** 143 archivos, ~19.800 líneas nuevas.
**Verificación:** API 249 tests · shared 74 · consola 10; lint, typecheck,
Prettier y `next build` en verde; recorrido punta a punta por HTTP con
sesiones reales (super_admin y finanzas) contra Supabase local.

### Qué se construyó (en orden)

| Fase | Spec                            | Migraciones | Qué quedó                                                                                                                                                                                                                        |
| ---- | ------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6    | `comisiones`                    | 0015        | Tarifas versionadas por comercio (bps + fijo + IVA 0 %/19 %) y por proveedor; un cobro exige ambas y las fija en sí mismo; `calcularTarifa` idéntico en TypeScript (BigInt, half-up) y en SQL, con test cruzado.                 |
| 6    | `ledger-custodia`               | 0016        | Asiento dividido (al comercio · comisión · IVA · costo del proveedor); plan de cuentas en un archivo; trigger diferido que impide un asiento descuadrado; consignación asistida de ComboPay; cuadre de custodia diario (Bogotá). |
| 7    | `dispersion` + `rbac-operativo` | 0017        | Lotes programado → aprobado → pagado \| fallido, cuatro ojos como CHECK en la base, reserva y retención del primer cobro, roles `super_admin` / `ops` / `finanzas` con una tabla de permisos por acción (API y consola).         |
| 8    | (solidez)                       | 0018        | RLS en `identity.tenants` con funciones `SECURITY DEFINER`; FK `payments_merchant_id_fkey` validada (dos pagos huérfanos locales se reasignaron).                                                                                |
| 9    | `riesgo-comercio`               | 0019        | Motor determinista en `@evetev/shared`; reglas con modos activa / shadow / inactiva; evaluaciones inmutables; retención de riesgo; lista restrictiva (SARLAFT) cruzada en el alta; pantallas Riesgo y Auditoría.                 |
| 10   | (Command Center)                | 0020        | `admin_resumen`, estado de cuenta por comercio, reporte fiscal y exportes CSV.                                                                                                                                                   |
| 11   | `reembolsos-contracargos`       | 0021        | Estado `reembolsado`, reparto proporcional (SQL = TS), contracargos con plazo de evidencia, deuda del comercio descontada en su siguiente lote, reglas de tarjeta evaluadas al aprobar, `PaymentProvider.reembolsar?`.           |
| —    | consola                         | 0022, 0023  | `admin_comercios_resumen` (listado) y `admin_resumen_riesgo` + disparos de hoy y liberadas por regla (pantalla Riesgo).                                                                                                          |

Las migraciones 0015–0023 están aplicadas **solo en local**.

### Consola: rediseño al estilo del prototipo

Insumo: el prototipo HTML de la fundadora (paleta dorada) y
`ARQUITECTURA_CONSOLA_EVEPAY.md`. Se tomó la **estructura** (menú, pantallas,
densidad) y se mantuvo la **paleta de la marca** (`packages/brand`).

- **Menú en tres grupos**: Operación (Command Center · Comercios ·
  Transacciones · Liquidación & Dispersión · Ledger & Conciliación), Riesgo
  (Riesgo & Antifraude · Contracargos · Onboarding & KYC/KYB) y Plataforma
  (Comisiones & Pricing · Configuración · Reportes · Auditoría · Usuarios &
  RBAC). Insignias con lo pendiente real (sin KYC, cola de riesgo,
  contracargos abiertos) y pie con la persona y su rol.
- **Comercios**: chips Todos · Activos · En revisión · Onboarding ·
  Inactivos, búsqueda, columnas Ciudad · Estado · KYC · Volumen del mes · Por
  pagar (rojo si es deuda) · Tarifa · Riesgo.
- **Transacciones** (antes «Pagos», ruta `/pagos` conservada): chips por
  estado más «Retenidas», columnas ID · Comercio · Monto · Proveedor · Estado
  · Riesgo · Fecha.
- **Riesgo & Antifraude**: KPIs del día, reglas como tarjetas con la
  condición legible y selector Activa · Shadow · Off, cola de revisión manual
  al lado con los contracargos abiertos.
- **Nuevas**: `/contracargos` (todos, por estado y urgencia), `/tarifas`
  (Comisiones & Pricing: vigentes por comercio, activos sin tarifa, tarifa del
  proveedor), `/usuarios` (roles, matriz de permisos, cómo se aprovisiona).
- **Configuración · Proveedores**: tarjetas con avatar, situación (operando ·
  listo · onboarding · inactivo), Activo/Activar informativo y casillas del
  perfil de capacidades; credenciales, webhook y habilitación plegados.

### Decisiones que no estaban escritas en las specs

- **Errores de Postgres**: Drizzle los envuelve en `DrizzleQueryError` con la
  causa dentro; `errorDeBase` / `traducirErrorDeBase` (23514 → 400, 23505 →
  409, P0002 → 404). Se corrigieron dos chequeos latentes que miraban el
  código en el objeto equivocado.
- **Desempate de vigencia**: dos filas con el mismo `now()` en una transacción
  hacían ambigua «la vigente»; columna `secuencia` identity en tarifas y
  saldos de recaudo.
- **`calcular_tarifa`** en `numeric` con `floor` (el `bigint` desbordaba).
- **`admin_preparar_lote`** devuelve `null` si no hay nada disponible, en vez
  de lanzar: el `RAISE` deshacía la retención del primer cobro.
- **Deuda del comercio** = Σ(al comercio − reembolsado de los cobros no
  dispersados) − saldo de `merchant_payable`. Definirla como «saldo negativo»
  desaparecía al entrar un cobro nuevo.
- **Un reembolso, un movimiento**: kind `cobro_reembolsado:<8 chars>` porque
  el índice único por payment + kind impedía varios parciales.
- **Riesgo**: pre-cobro solo reglas de comercio; post-evento (webhook de
  aprobación) solo reglas de tarjeta, con las señales que mande el proveedor.
- **Falsos positivos** no se inventan como porcentaje: por regla se muestra
  «liberadas al revisar a/b» (retenciones que causó y que alguien liberó).
- **Sin «crear usuario» ni «activar proveedor» en la consola**: el rol va en
  el JWT y solo se escribe con la clave de servicio; el proveedor activo es
  `PAYMENT_PROVIDER` en el entorno. Ambas cosas cambian el riel del dinero y
  deben pasar por despliegue, no por un botón.
- **Método de pago** no se muestra en Transacciones: el checkout de ComboPay
  no lo reporta al hook. Cuando el proveedor lo mande, se agrega.

### Datos de prueba locales

El Tornillo: cobro de $50.000 reembolsado por completo → deuda saldable en su
siguiente lote. Un cobro de «Cobros» quedó `reembolsado` por contracargo
perdido. El cuadre de custodia muestra descuadre esperado hasta registrar el
saldo del banco. Usuarios: `admin@evetev.com` (super_admin) y
`finanzas@evetev.com` (finanzas).

### Cómo levantar el entorno local

```bash
corepack pnpm --filter @evetev/shared build
# API (el .env de apps/api apunta a la base alojada; en local se pasa todo por línea de comandos)
cd apps/api && PORT=3011 PAYMENT_PROVIDER=fake \
  DATABASE_URL=postgresql://evepay_api:postgres@127.0.0.1:57322/postgres \
  SUPABASE_URL=http://127.0.0.1:57321 \
  SUPABASE_JWT_SECRET=<el por defecto del CLI de Supabase> \
  corepack pnpm exec nest start
# Consola
cd apps/evepay-admin && NEXT_PUBLIC_API_URL=http://localhost:3011 corepack pnpm dev   # :3004
```

La API en 3001 es una compilación vieja; la nueva va en 3011 y **no recarga
sola**: tras cambiar la API hay que reiniciarla.

### Pendiente

1. `git push -u origin feat/evepay-comisiones` y abrir el PR (con `gh` sin
   autenticar, se abre desde GitHub). Pide confirmación de la fundadora.
2. Revisar las pantallas en el navegador (se probaron por HTTP y build, no a
   ojo).
3. Ofrecido, no confirmado: ficha del comercio con pestañas Resumen · Cobro ·
   Dispersión · Riesgo, como el drawer del prototipo.
4. **Fase 8 externa**: desplegar API y consola; aplicar 0005–0023 y Auth en el
   Supabase alojado; cargar tarifas por consola; credenciales de ComboPay en
   sandbox; refactor R3–R6 de `admin-console` (no bloquea).
5. Lo que depende del proveedor: método de pago en el hook, score/señales de
   tarjeta, reembolsos por API (todo detrás de `capacidades`).
