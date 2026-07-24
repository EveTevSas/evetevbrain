## Qué hace este PR


## Checklist (Definition of Done)

**Funcionalidad**
- [ ] Hace lo que pide el ticket; probado camino feliz + un caso de error.

**Código**
- [ ] `lint`, `typecheck` y `test` en verde.
- [ ] Sin `any` injustificado; fronteras de entrada validadas con Zod.
- [ ] Respeta fronteras de módulos (no importa entrañas de otro módulo).

**Seguridad**
- [ ] Datos de tenant aislados por RLS; sin fuga entre tenants.
- [ ] Si toca pagos: idempotente, auditado, sin datos de tarjeta en servidor/logs.
- [ ] Sin secretos en el código; `.env.example` actualizado si cambió la config.
- [ ] Endpoints declaran rol requerido (RBAC); logs sin PII sensible.

**Accesibilidad**
- [ ] Navegable solo con teclado; foco visible.
- [ ] Contraste AA; formularios con labels y errores claros.
- [ ] Lighthouse/axe sin errores críticos en la pantalla nueva.

**Operación**
- [ ] README/.env.example actualizados si cambió cómo se corre.
- [ ] Eventos relevantes se registran (para producto e IA).
