# Tareas — Riesgo del comercio

- [x] G1 — Motor `evaluarRiesgo` y esquemas en `@evetev/shared`, con tests (CA-5, CA-6, CA-7, shadow, prioridad rechazar > retener).
- [x] G2 — Migración 0019: reglas, evaluaciones, retención `riesgo`, lista restrictiva, funciones y semilla en shadow.
- [x] G3 — Módulo `riesgo` (puerto + Drizzle + in-memory) y `PagosService` con el motor antes del proveedor (CA-1, CA-2, CA-3).
- [x] G4 — Endpoints admin de reglas, evaluaciones, cola y listas, con permisos (CA-8, CA-10, CA-11); cruce en el alta (CA-9); liberar riesgo (CA-4).
- [x] G5 — Consola: secciones Riesgo y Auditoría.
- [x] G6 — Validar typecheck · lint · test · build y recorrer en local: regla en shadow no actúa; activada rechaza; monto atípico retiene y la cola lo muestra; el alta con documento en lista se bloquea.
- [x] G7 — Pantalla Riesgo al estilo del prototipo (11-sep-2026): migración 0023 con `admin_resumen_riesgo` (evaluadas, rechazadas y retenidas del día en Bogotá, cola) y, por regla, disparos de hoy y retenciones liberadas al revisar (≈ falsos positivos); `GET /admin/riesgo/resumen`; reglas como tarjetas con condición y selector Activa · Shadow · Off; cola de revisión manual al lado.
