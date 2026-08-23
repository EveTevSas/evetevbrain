# Plan técnico

- Tabla `conjuntos.mascotas` con tenant, persona y unidad como llaves de aislamiento.
- RLS de lectura para administración y la unidad; creación y cambio de estado solo para el
  residente autenticado vinculado a la persona.
- El cliente no envía `persona_id`, `unidad_id` ni `conjunto_id`; la API los resuelve desde la
  sesión y la relación vigente.
- El snapshot del residente se filtra por unidad antes de enviarse al navegador.
- El contador de mascotas de la persona se deriva de registros activos.
- Las fotos viven en un bucket privado con límite de 5 MB y tipos MIME permitidos; el snapshot
  conserva únicamente la ruta interna y la interfaz genera enlaces firmados de corta duración.
- La ruta contiene conjunto, usuario y mascota; RLS y una función transaccional vuelven a
  comprobar esas tres relaciones antes de asociar la imagen.
