# Comunicados multicanal

## Propósito

Permitir que la administración cree, programe o guarde comunicados para audiencias de la
copropiedad, conservando el registro y la evidencia de entrega por canal.

## Datos mínimos

- Título y mensaje.
- Audiencia: todos los residentes, propietarios o residentes con mascotas.
- Uno o más canales: App, correo o WhatsApp.
- Modalidad: publicar ahora, programar o guardar como borrador.
- Fecha y hora futura cuando la publicación sea programada.

## Criterios de aceptación (EARS)

1. **CUANDO** administración o superadministración pulse `Nuevo comunicado`, **EL sistema
   DEBERÁ** abrir el formulario de creación.
2. **CUANDO** falte título, mensaje o al menos un canal, **EL sistema DEBERÁ** rechazar el
   registro con un mensaje claro.
3. **CUANDO** se programe un comunicado, **EL sistema DEBERÁ** exigir una fecha futura.
4. **CUANDO** se complete el registro, **EL sistema DEBERÁ** persistirlo en Supabase, añadirlo
   al escenario visible y registrar auditoría sin copiar el mensaje al detalle del evento.
5. **CUANDO** un residente intente crear un comunicado, **EL sistema DEBERÁ** ocultar la acción
   y bloquear la operación tanto en la API como mediante RLS.
6. **CUANDO** un usuario consulte comunicados, **EL sistema DEBERÁ** devolver únicamente los
   pertenecientes a sus copropiedades activas.
