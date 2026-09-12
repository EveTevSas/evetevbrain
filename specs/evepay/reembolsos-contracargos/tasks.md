# Tareas — Reembolsos, contracargos y antifraude de tarjeta

- [x] F1 — Contrato: `reembolsado`, `reembolsos` en capacidades, `reembolsar?`, `repartirReembolso` con tests (CA-7), señales y reglas de tarjeta en el motor con tests (CA-5).
- [x] F2 — Migración 0021: reembolsos, contracargos, `repartir_reembolso`, registrar/resolver, deuda en el lote; validada contra la base local (CA-1 a CA-4, CA-7).
- [x] F3 — API: `ReembolsosAdminService`, endpoints y permisos; riesgo post-evento en `WebhooksService` (CA-5); tests.
- [x] F4 — Consola: reembolso y contracargo en la ficha del cobro, deuda en el balance, reglas de tarjeta en Riesgo (CA-6).
- [x] F5 — Validar typecheck · lint · test · build y recorrer en local: reembolso parcial y total, contracargo perdido, deuda descontada en el siguiente lote, cobro retenido por señal de tarjeta.
