# Tareas — Ledger con custodia

Requiere [`comisiones`](../comisiones/) (C1–C4) antes de L3.

- [ ] L1 — Capacidades ampliadas en `@evetev/shared` y en los tres proveedores.
- [ ] L2 — Plan de cuentas en un solo archivo; `banco` → `recaudo` en los asientos nuevos.
- [ ] L3 — `registrarCobroAprobado` con comisión, IVA y costo del proveedor (CA-1, CA-2) y fallo sin custodia (CA-3).
- [ ] L4 — Migración 0016: trigger diferido de balance (CA-10), consignaciones, saldos de recaudo y funciones admin.
- [ ] L5 — `admin_registrar_consignacion` con los CA-4 a CA-7, probada contra la base local, incluido que P en SQL = P en TypeScript.
- [ ] L6 — Saldo del banco y cuadre de custodia (CA-8).
- [ ] L7 — Balance por comercio con margen y el signo de cada naturaleza (CA-9); unificar el signo entre servicio y consola.
- [ ] L8 — Consola: registrar consignación, registrar saldo, aviso de descuadre y bloque Balance.
- [ ] L9 — Actualizar `ledger-posting` y `reconciliation` donde esta spec los cambia.
- [ ] L10 — Validar typecheck · lint · test · build, y recorrer en local con el ejemplo de $50.000: cobro → aprobado → consignación de $49.200 → saldo del banco → cuadre en cero, $48.572 por pagar al comercio, $228 de IVA y margen de $400.
