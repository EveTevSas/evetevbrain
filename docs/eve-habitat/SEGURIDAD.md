# Seguridad y privacidad

## Controles implementados

- RLS forzado y `default deny` en tablas de tenant.
- Pruebas pgTAP de lectura y escritura cruzada.
- respuestas 404 de API para no revelar recursos de otro tenant;
- roles explícitos en el contexto y autorización negativa de gastos;
- checkout hospedado: no se almacena ni procesa PAN;
- idempotencia por tenant, operación, clave y hash de payload;
- firma HMAC con comparación de tiempo constante;
- máquina de estados que impide regresiones;
- ledger y auditoría append-only;
- montos enteros en unidad menor;
- Helmet, CORS explícito y respuestas Problem Details sin stack/PII;
- cola offline mínima y deduplicada;
- solicitudes de titulares y política de retención modeladas.

## Gestión de secretos

`.env.example` solo contiene nombres y valores locales no sensibles. Producción
debe usar el gestor de secretos del hosting. `SUPABASE_SECRET_KEY`, claves de
proveedor, `INNGEST_SIGNING_KEY` y secretos de webhook no se exponen con prefijo
`NEXT_PUBLIC_`.

## Amenazas prioritarias

| Amenaza                   | Control                                            |
| ------------------------- | -------------------------------------------------- |
| fuga entre copropiedades  | JWT de tenant + guard API + RLS + pruebas cruzadas |
| doble cobro por reintento | idempotencia y coalescencia concurrente            |
| replay de webhook         | firma, inbox único y transición monotónica         |
| manipulación contable     | doble partida, triggers append-only y reversos     |
| reserva concurrente       | exclusión GiST por rango de tiempo                 |
| pérdida de dispositivo    | datos mínimos, vencimiento y revocación prevista   |
| abuso de permisos         | roles, aprobación múltiple y auditoría de actor    |

## Antes de producción

1. activar Supabase Auth real y deshabilitar todos los defaults demo;
2. rotar claves y probar restauración por ambiente;
3. ejecutar DAST/SAST y revisión manual OWASP;
4. certificar adaptador de pago con el proveedor;
5. completar revisión jurídica/contable externa;
6. verificar WCAG 2.2 AA con usuarios y tecnología asistiva.
