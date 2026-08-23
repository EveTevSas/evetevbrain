# Acceso vehicular y parqueaderos

## Propósito

Administrar vehículos permanentes, autorizaciones temporales, parqueaderos y eventos de
portería sin confundir el permiso de ingreso con el derecho de uso de un parqueadero.

## Reglas de dominio

- Un vehículo permanente con registro vigente puede ingresar sin autorización por visita.
- Cada residente registra los vehículos permanentes vinculados a su propia persona y unidad.
- La administración mantiene el inventario y las asignaciones de parqueaderos, pero no registra
  vehículos en nombre de los residentes.
- Tener acceso vehicular no implica tener un parqueadero asignado.
- Un parqueadero usa uno de dos sistemas: numeración por zona/lote/manzana o asociación a
  una casa/unidad. Ambos sistemas pueden convivir en un conjunto.
- El código visible del parqueadero es único por conjunto y conserva sus componentes
  estructurados.
- Cada parqueadero y cada vehículo solo pueden tener una asignación activa.
- Toda decisión de ingreso o salida queda en un evento inmutable, incluyendo denegaciones.
- La placa y la relación persona–unidad se muestran solo a usuarios autorizados y no se
  copian a logs técnicos ni al detalle de auditoría.

## Criterios de aceptación (EARS)

1. **CUANDO** se registre un parqueadero por zona, **EL sistema DEBERÁ** exigir código,
   sector y número, y **DEBERÁ** impedir repetir su código normalizado en el mismo conjunto.
2. **CUANDO** se registre un parqueadero asociado a una unidad, **EL sistema DEBERÁ** exigir
   una unidad base y permitir códigos como `C18-1` y `C18-2`.
3. **CUANDO** un vehículo permanente tenga estado autorizado y vigencia activa, **EL
   sistema DEBERÁ** autorizar su ingreso aun cuando no tenga parqueadero asignado.
4. **CUANDO** un vehículo tenga parqueadero asignado, **EL sistema DEBERÁ** informar a
   portería la unidad destino y el código del parqueadero.
5. **CUANDO** una placa corresponda a una visita vigente, **EL sistema DEBERÁ** autorizar el
   movimiento temporal y actualizar su estado de ingreso o salida.
6. **CUANDO** una placa esté suspendida, vencida o no registrada, **EL sistema DEBERÁ**
   denegar el acceso y registrar la razón sin exponer datos adicionales de la persona.
7. **CUANDO** un residente consulte la información, **EL sistema DEBERÁ** limitar vehículos,
   parqueaderos y eventos a sus unidades vigentes.
8. **CUANDO** un usuario de otro conjunto consulte las tablas del módulo, **EL sistema
   DEBERÁ** devolver cero filas y bloquear cualquier modificación.
9. **CUANDO** un residente registre un vehículo, **EL sistema DEBERÁ** resolver la persona,
   unidad y autorización desde su sesión sin aceptar esos identificadores desde el cliente.
10. **CUANDO** la administración consulte Comunidad, **EL sistema NO DEBERÁ** mostrar la
    acción de registrar vehículo y **DEBERÁ** conservar la acción de registrar parqueadero.
11. **CUANDO** un residente consulte Comunidad, **EL sistema DEBERÁ** mostrar la acción de
    registrar vehículo sin habilitar la creación ni asignación de parqueaderos.
