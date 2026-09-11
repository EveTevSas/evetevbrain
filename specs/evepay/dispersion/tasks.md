# Tareas — Dispersión

- [x] D1 — `repartirReserva`, `PoliticaDispersionSchema` y `retenido` en `@evetev/shared`, con tests del reparto (suma exacta, redondeo).
- [x] D2 — Migración 0017: política, retenciones, lotes, items, funciones de balance, preparar, aprobar (cuatro ojos en check), pagar (asientos), fallar, liberar (CA-1 a CA-12 en la base).
- [x] D3 — Validar 0017 contra la base local: preparar → aprobar (misma persona rechazada) → pagar → cuadre exacto; fallido → re-lote; primer cobro retenido; reserva y liberación.
- [x] D4 — `DispersionAdminService` + endpoints admin + tests (errores de base → HTTP, validación de cuerpos, roles).
- [x] D5 — Consola: sección Dispersión (balances, lotes, retenciones) y bloque Dispersión en la ficha.
- [x] D6 — Validar typecheck · lint · test · build y recorrer en local: el cobro de $50.000 conciliado → lote de $48.572 → aprobado por otra persona → pagado → balance por pagar 0, recaudo 0, cuadre exacto.
