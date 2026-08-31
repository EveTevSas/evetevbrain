# Aprobación de gastos por dos personas

## Propósito

Que la doble aprobación de un gasto signifique dos personas distintas, no dos clics de la
misma cuenta, con el control aplicado en la base de datos y con el consejo habilitado como
aprobador (la interfaz ya le ofrecía el botón y el servidor lo rechazaba).

## Decisiones de producto

- Registrar gastos sigue siendo exclusivo de la administración.
- Aprueban gastos: `super_admin`, `admin_conjunto` y `consejo`.
- Cada aprobación queda atada al `auth.uid()` de quien aprueba; la misma identidad no
  puede aprobar dos veces.
- Pendiente de ratificación del responsable: la incorporación del consejo como aprobador
  se adoptó para que el flujo de dos aprobaciones sea completable en el demo estándar
  (una sola cuenta administradora por copropiedad).

## Criterios de aceptación (EARS)

1. **CUANDO** una persona con rol aprobador registre una aprobación, **EL sistema
   DEBERÁ** guardar su identidad junto al contador de aprobaciones.
2. **CUANDO** la misma identidad intente aprobar de nuevo el mismo gasto, **EL sistema
   DEBERÁ** rechazarla indicando que falta otra persona.
3. **CUANDO** dos identidades distintas completen las aprobaciones requeridas, **EL
   sistema DEBERÁ** marcar el gasto como aprobado.
4. **CUANDO** un residente intente aprobar, **EL sistema DEBERÁ** denegarlo en la función
   de base de datos, no solo en la interfaz.
5. **CUANDO** el gasto ya no esté pendiente, **EL sistema DEBERÁ** rechazar nuevas
   aprobaciones.
6. **CUANDO** un gasto sembrado sin registro de aprobadores reciba una aprobación, **EL
   sistema DEBERÁ** conservar el contador previo sin duplicarlo.
