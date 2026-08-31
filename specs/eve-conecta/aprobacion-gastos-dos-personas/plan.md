# Plan técnico

- Función `conjuntos.aprobar_gasto_demo` (security definer): valida membresía y rol
  aprobador, deduplica por `auth.uid()` en `approvedBy`, actualiza contador y estado
  dentro del snapshot con `for update`, y audita en el snapshot y en
  `conjuntos.eventos_auditoria`.
- Códigos de error: `42501` rol/membresía, `P0002` gasto o escenario inexistente,
  `23505` misma identidad, `55000` gasto no pendiente; la API los traduce a
  403/404/409/409.
- El contrato `ExpenseItem` incorpora `approvedBy?: string[]` (identificadores, no
  nombres).
- La interfaz oculta «Registrar gasto» para el consejo y conserva «Aprobar».
- pgTAP cubre: primera aprobación, duplicado, segunda persona completa, gasto ya
  aprobado y rechazo al residente.
