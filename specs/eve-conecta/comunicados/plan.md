# Plan técnico

- Tabla `conjuntos.comunicados` con tenant, audiencia, canales, estado y creador.
- RLS forzado: lectura para miembros activos y creación únicamente para administración.
- Función transaccional que inserta el registro, actualiza el snapshot y agrega auditoría.
- Contratos Zod estrictos para contenido, audiencia, canales y programación futura.
- Modal accesible que actualiza la lista después de crear, programar o guardar el borrador.
