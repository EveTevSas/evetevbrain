# Base de datos multi-tenant de EveConecta

## Objetivo

Crear el cimiento de persistencia de EveConecta en Supabase/Postgres sin mezclar
su dominio con EvePay. El conjunto es el tenant y la deuda pertenece a la unidad.
El despliegue remoto vive en un proyecto Supabase dedicado llamado `Eveconecta`;
no comparte proyecto ni schema con otras verticales.

## Alcance

- Schema `conjuntos`.
- Conjuntos, membresías, unidades, personas y vínculos persona–unidad.
- Generaciones de cuotas, cuotas, movimientos de cuenta y auditoría.
- Autorización por RLS para `super_admin`, `admin_conjunto`, `consejo` y
  `residente`.
- Configuración reproducible de Supabase local y clientes de Auth/Drizzle.

No incluye todavía generación de cuotas, aplicación de pagos, intereses, paz y
salvo ni webhooks de EvePay. Esas reglas requieren specs propias.

## Criterios de aceptación (EARS)

1. **CUANDO** un usuario autenticado consulta datos, **EL** sistema **DEBERÁ**
   devolver únicamente filas de conjuntos en los que tenga una membresía activa.
2. **CUANDO** un residente consulta unidades, cuotas o movimientos, **EL** sistema
   **DEBERÁ** devolver únicamente las unidades asociadas a su persona.
3. **CUANDO** un miembro del consejo consulta información financiera,
   **EL** sistema **DEBERÁ** impedir el acceso a cuotas y movimientos
   identificables por unidad.
4. **CUANDO** un administrador modifica datos, **EL** sistema **DEBERÁ** permitir
   la operación solo dentro de su conjunto.
5. **CUANDO** se intenta actualizar o eliminar un movimiento de cuenta o evento
   de auditoría, **EL** sistema **DEBERÁ** rechazar la operación.
6. **CUANDO** se registra un vínculo con EvePay, **EL** sistema **DEBERÁ** guardar
   únicamente el UUID externo, sin FK ni consulta al schema `evepay`.
7. **CUANDO** se prepara local, preview o producción, **EL** sistema **DEBERÁ**
   usar una base de datos propia del ambiente, sin compartir datos entre ellos.
