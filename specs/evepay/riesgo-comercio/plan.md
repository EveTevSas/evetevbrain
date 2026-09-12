# Plan — Riesgo del comercio

## Contrato (`@evetev/shared`)

- `riesgo.ts`: `ReglaRiesgoSchema` (tipo, alcance, parámetros por tipo,
  acción, modo, prioridad), `SenalesRiesgo` (`hoyMinor`, `mesMinor`,
  `ticketPromedioMinor`, `cobrosHistoricos`), `evaluarRiesgo(montoMinor,
senales, reglas) → { decision, disparadas[] }`. Determinista, en enteros. La
  regla por comercio reemplaza a la global del mismo tipo.

## Persistencia (migración 0019)

- `evepay.reglas_riesgo` (editable, auditada por función) y
  `evepay.evaluaciones_riesgo` (inmutable, RLS por tenant para que el comercio
  pueda ver las suyas más adelante; la consola por función).
- `retenciones.tipo` admite `riesgo`; `cobros_dispersables` y el balance
  excluyen/suman también las de riesgo.
- `evepay.lista_restrictiva` + `admin_coincidencias_restrictivas(jsonb docs)`.
- Funciones: `senales_riesgo(tenant)`, `reglas_riesgo_de(tenant)` (globales +
  propias), `registrar_evaluacion_riesgo(...)`, `retener_por_riesgo(payment,
evaluacion, actor)`, `admin_guardar_regla_riesgo`, `admin_listar_reglas`,
  `admin_listar_evaluaciones`, `admin_cola_riesgo`, `admin_agregar_lista_restrictiva`,
  `admin_listar_lista_restrictiva`.
- Semilla: las cuatro reglas de arranque en shadow.

## Núcleo

- Módulo `riesgo`: `RiesgoRepository` (puerto, Drizzle, in-memory) y
  `RiesgoService.evaluarCobro(tenant, merchant, monto)` → decisión; `PagosService`
  lo llama después de las tarifas y antes del proveedor: rechazar → 409 con las
  reglas; retener → crea el cobro y luego `RiesgoService.retener(cobro, evaluacion)`.
- `AdminService.crearComercio` cruza los documentos con la lista antes de crear.

## API y consola

- `GET/PUT /v1/admin/riesgo/reglas[/:id]`, `GET /v1/admin/riesgo/evaluaciones`,
  `GET /v1/admin/riesgo/cola`, `GET/POST /v1/admin/riesgo/listas`,
  `POST /v1/admin/riesgo/listas/verificar`.
- Consola: sección **Riesgo** (reglas con modo, evaluaciones recientes, cola
  de revisión con liberar, listas restrictivas) y sección **Auditoría**.

## Decisiones

- **Retener antes que rechazar** para el monto atípico: con custodia, el dinero
  entra igual; lo que se protege es la salida.
- **Reglas en la base, motor en TypeScript**: la lista de reglas es
  configuración; la evaluación tiene que ser la misma en la API y en una
  simulación de la consola, y probarse sin base.
