# Tareas — Comisiones

- [x] C1 — `calcularTarifa`, `desglosarCobro` y `validarTarifa` en `@evetev/shared`, con tests de los CA-6, CA-8 y CA-12 (redondeo mitad arriba, montos grandes, IVA de 0 % y 19 %, y el ejemplo de $50.000).
- [ ] C2 — Migración 0015: `tarifas_comercio` (con `iva_bps` limitado a 0 o 1 900 en la base) y `tarifas_proveedor` inmutables, las dos referencias en `payments` y las funciones admin.
- [ ] C3 — Repositorio de tarifas (puerto + Drizzle + in-memory).
- [ ] C4 — `PagosService`: exigir las dos tarifas (CA-3, CA-4), rechazar comisión + IVA ≥ monto (CA-7) y fijarlas en el cobro (CA-5).
- [ ] C5 — Endpoints admin de las dos tarifas, con auditoría (CA-1, CA-8, CA-11).
- [ ] C6 — Consola: bloque Comisión en la ficha y tarifa en Proveedores, con el desglose compartido y la advertencia de margen negativo (CA-9, CA-10).
- [ ] C7 — Cargar la tarifa de ComboPay y asignar tarifa a los comercios existentes: sin ellas nadie puede cobrar.
- [ ] C8 — Validar typecheck · lint · test · build, y el CA-2 contra la base local.
