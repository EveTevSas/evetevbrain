# Registro de mascotas por residentes

## Propósito

Mantener un censo vigente de perros y gatos por unidad, administrado directamente por el
residente y visible para la administración sin permitir que una unidad modifique a otra.

## Datos mínimos

- Tipo: perro o gato.
- Año de nacimiento.
- Tamaño: grande, mediano o pequeño.
- Nombre.
- Estado: activo o inactivo.
- Foto de perfil opcional: JPG, PNG o WebP de máximo 5 MB.

El estado inactivo conserva el historial cuando la mascota fallece o deja de vivir en la
propiedad. El registro no se elimina.

## Criterios de aceptación (EARS)

1. **CUANDO** un residente autenticado registre una mascota, **EL sistema DEBERÁ** vincularla
   a su persona y unidad vigentes sin aceptar identificadores de otra unidad desde el cliente.
2. **CUANDO** falte cualquiera de los cinco campos, **EL sistema DEBERÁ** rechazar el registro
   con un mensaje claro.
3. **CUANDO** el año de nacimiento sea futuro, **EL sistema DEBERÁ** rechazar el registro.
4. **CUANDO** una mascota deje de vivir en la propiedad o fallezca, **EL residente DEBERÁ**
   poder marcarla inactiva sin borrar el registro.
5. **CUANDO** un residente consulte Comunidad, **EL sistema DEBERÁ** mostrar únicamente las
   mascotas de sus unidades vigentes.
6. **CUANDO** un residente intente crear o modificar una mascota de otra unidad, **EL sistema
   DEBERÁ** denegar la operación tanto en la API como mediante RLS.
7. **CUANDO** la administración consulte Comunidad, **EL sistema DEBERÁ** mostrar el censo de
   mascotas sin habilitar el registro en nombre del residente.
8. **CUANDO** el residente seleccione una foto válida, **EL sistema DEBERÁ** mostrar una vista
   previa y guardarla en almacenamiento privado al completar el registro.
9. **CUANDO** un usuario consulte una foto, **EL sistema DEBERÁ** autorizar el acceso únicamente
   si tiene una membresía habilitada sobre la copropiedad correspondiente.
10. **CUANDO** un residente reemplace una foto, **EL sistema DEBERÁ** validar que la mascota le
    pertenece y retirar el archivo anterior cuando cambie su formato.
