# EveLedger — MVP: Operación Diaria, Inventarios, Cartera, Financiero y Dashboard

MVP de cierre diario, inventarios, cartera, control financiero y dashboard
gerencial para una estación de servicio de combustibles en Colombia.
Next.js (App Router) + TypeScript + Tailwind + Prisma 7 + PostgreSQL.

> A diferencia de EveConecta, EveLedger **no consume EvePay**: no mueve dinero,
> lo registra. Vive en este monorepo por compartir marca, CI y despliegue, no
> por depender de la plataforma de pagos.

## Alcance

- Una sola estación, cierre por día (no por turnos), un único usuario administrador.
- Cierre diario: lecturas de mangueras (inicial arrastrada automáticamente del
  cierre anterior), ventas en galones y pesos, medios de pago, vales del día,
  faltantes de isleros y arqueo de caja con comprobación estricta en $0.
- Inventarios por producto: compras del día (descargas) e inventario físico
  (varilla/telemedición) digitados a mano; inicial (físico de ayer), ventas
  (del cierre cerrado), existencia teórica y variación derivados; alerta de
  merma cuando la variación supera el umbral (0,5 % de la teórica, mín. 1 gal).
- Cartera: clientes corporativos con cupo de crédito; los vales del cierre
  alimentan la cartera; ciclo vale → factura (solo cierres cerrados); aging en
  7 rangos (0-30 … >360) con semáforo; abonos con aplicación FIFO (matan
  primero la factura más vieja); alerta de sobrecupo.
- Financiero: margen por producto (P/VENTA derivado de los cierres menos
  P/COMPRA y FLETE digitados por mes) con utilidad bruta del mes; gastos
  operativos (nómina, servicios, fletes, otros) con comparativa contra el mes
  anterior.
- Dashboard gerencial: KPIs del mes (ventas, utilidad bruta, cartera total y
  vencida, transportadora, faltantes), torta de medios de pago, barras de
  galones por producto y alertas (cartera vencida, mermas). Solo lectura.
- Consolidado mensual de galones (solo lectura, derivado de los cierres CLOSED).
- Configuración de productos y mangueras desde la app.
- Fuera de alcance: conciliación bancaria y capital de trabajo (pendiente de
  especificación; por eso el dashboard no muestra "plata en bancos"),
  multi-estación, facturación electrónica, roles múltiples.

## Requisitos

- Node 22 (`.nvmrc` de la raíz) y pnpm 9+ vía Corepack. Los comandos se lanzan
  desde la raíz del monorepo con `--filter @evetev/eveledger`, o desde esta
  carpeta con `pnpm <script>`.
- PostgreSQL en `localhost:5432` para desarrollo (sin Docker). Conexión local sin
  password para el usuario del sistema. En producción se usa el proyecto Supabase
  de EveLedger; ver [`docs/DESPLIEGUE.md`](../../docs/DESPLIEGUE.md).

## Puesta en marcha

```bash
createdb eveledger        # o: psql -d postgres -c "CREATE DATABASE eveledger;"
cp .env.example .env      # completa DATABASE_URL, AUTH_SECRET y ADMIN_PASSWORD
corepack pnpm install     # desde la raíz del monorepo
pnpm --filter @evetev/eveledger db:migrar:dev   # crea las tablas
pnpm --filter @evetev/eveledger db:sembrar      # crea el admin y datos de ejemplo
pnpm --filter @evetev/eveledger dev             # http://localhost:3007
```

## Credenciales

El usuario administrador lo crea la semilla a partir de `ADMIN_EMAIL` y
`ADMIN_PASSWORD` del `.env`. En desarrollo basta con los valores de
`.env.example`; **en producción hay que ponerlos antes de sembrar**, porque son
las credenciales con las que se entra a la aplicación. Para cambiarlos después,
se ajusta el `.env` y se vuelve a correr `db:sembrar`.

La sesión es una cookie firmada con `AUTH_SECRET` (HMAC-SHA256, 12 horas). Ese
secreto no tiene valor por defecto útil: si no se fija, todas las instalaciones
firman igual.

## Flujo de uso

1. **Configuración** (`/config`): define productos (ej. Corriente, ACPM, Extra)
   y sus mangueras. No se pueden eliminar productos/mangueras con lecturas.
2. **Nuevo cierre** (`/cierres/nuevo`): elige la fecha. Las lecturas iniciales se
   arrastran del último cierre anterior; en el primer cierre de cada manguera se
   digitan una sola vez como lectura base y luego quedan bloqueadas.
3. **Formulario de cierre** (`/cierres/[id]`): digita lectura final, calibración
   y precio por manguera (galones = final − inicial − calibración; pesos =
   galones × precio), pagos (transportadora/credibanco/redeban/otro), vales
   (se elige un cliente de cartera activo) y faltantes de isleros. El arqueo
   muestra en vivo:
   `comprobación = total ventas − (efectivo + tarjetas + transportadora + vales
   - faltantes netos)`. "Guardar borrador" siempre que los datos sean válidos;
     "Cerrar día" solo cuando la comprobación es exactamente $0 (el servidor
     también lo exige). Al cerrar, el día queda en solo lectura.
4. **Consolidado** (`/consolidado`): matriz días × productos con galones
   vendidos (solo cierres cerrados), totales por producto, por día y del mes.
   Sin digitación.
5. **Inventarios** (`/inventarios`): matriz mensual por producto con inicial
   (físico de ayer), compras, ventas (del cierre cerrado), teórica
   (inicial + compras − ventas), físico y variación (físico − teórica). Desde
   "Editar" de cada día (`/inventarios/[fecha]`) se digitan las descargas del
   día y el físico por producto (vacío = no digitado). Si la variación supera
   el umbral se muestra una alerta (posible fuga o robo). Editable cualquier
   día, sin bloqueo por el estado del cierre.
6. **Cartera** (`/cartera`): crea clientes con su cupo de crédito. En
   `/cartera/[id]` se ven los vales sin facturar (los de cierres en borrador
   no son facturables), se genera la factura del corte con un clic (el aging
   arranca en la fecha de emisión) y se registran abonos. La tabla de facturas
   muestra total, abonado FIFO, pendiente, días de mora, rango (0-30 … >360)
   y semáforo (verde ≤30, ámbar 31–90, rojo >90). Se alerta cuando el saldo
   supera el cupo.
7. **Financiero** (`/financiero`): con el selector de mes se ve el margen por
   producto: galones del mes, P/VENTA (ventas ÷ galones, derivado de los
   cierres cerrados), P/COMPRA y FLETE digitados, margen por galón y utilidad
   bruta (margen × galones). Abajo se registran los gastos operativos del mes
   (nómina con # empleados, servicios con KW, fletes, otros) y la comparativa
   por categoría contra el mes anterior con su diferencia en $ y %.
8. **Dashboard** (`/dashboard`): resumen gerencial del mes, sin digitación.
   Tarjetas KPI (ventas, utilidad bruta, cartera total y vencida >90 días,
   transportadora, faltantes netos), torta de medios de pago (el efectivo es el
   residual de la ecuación del arqueo), barras de galones por producto y las
   alertas del mes (cartera vencida por cliente y mermas de inventario).

## Comandos

Desde esta carpeta (o desde la raíz con `pnpm --filter @evetev/eveledger <script>`):

```bash
pnpm dev          # desarrollo         → http://localhost:3007
pnpm build        # build de producción (incluye `prisma generate`)
pnpm lint         # ESLint, sin advertencias permitidas
pnpm typecheck    # prisma generate + next typegen + tsc --noEmit
pnpm test         # tests unitarios (Vitest) de src/lib/calc.ts
pnpm db:migrar    # aplica migraciones ya escritas (producción)
pnpm db:sembrar   # crea el admin y datos de ejemplo
```

Los scripts de integración corren contra una base real y **escriben en ella**;
son para desarrollo local, no para CI:

```bash
pnpm exec tsx scripts/integracion.ts              # lógica de cierres
pnpm exec tsx scripts/integracion-inventario.ts   # módulo de inventarios
pnpm exec tsx scripts/integracion-cartera.ts      # módulo de cartera
pnpm exec tsx scripts/integracion-financiero.ts   # módulo financiero
pnpm exec tsx scripts/integracion-dashboard.ts    # dashboard
```

## Notas de diseño

- Todo lo calculado (galones, pesos, arqueo, comprobación) se deriva con
  funciones puras en `src/lib/calc.ts`, compartidas entre cliente y servidor;
  no se persiste ningún campo calculado.
- El "efectivo registrado" es un input del arqueo y no se persiste (el modelo
  de datos no lo contempla): en un borrador arranca en 0 y hay botón "Sugerir"
  que lo calcula para cuadrar; en un cierre cerrado se muestra derivado del
  resto del arqueo.
- Las fechas de cierre se guardan como medianoche UTC (`@unique`), lo que evita
  ambigüedades de zona horaria.
- Los pagos tipo `OTRO` quedan registrados pero, por regla de negocio, no hacen
  parte de la ecuación del arqueo.
- En inventarios solo se persisten compras y físico (`Compra`,
  `InventarioFisico`); el inicial es el físico del día anterior y las ventas
  salen del cierre CLOSED del día, todo derivado al leer.
- En cartera solo se persisten clientes, vales, facturas y abonos; saldos,
  totales de factura, aplicación FIFO y aging (rangos y semáforo) se derivan
  al leer con funciones puras de `src/lib/calc.ts`.
- En financiero solo se persisten costos (`CostoProductoMes`) y gastos
  (`GastoOperativo`); P/VENTA (promedio ponderado: Σ pesos ÷ Σ galones del
  mes), márgenes, utilidades y comparativas se derivan al leer.
- El dashboard no persiste nada: compone en `/src/lib/dashboard.ts` lo que
  derivan los otros módulos. Las gráficas son SVG/CSS puros (sin librería de
  charts).
