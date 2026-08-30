# Plan técnico

- PostgreSQL/Supabase mantiene inventario, vehículos, asignaciones e historial de accesos.
- Todas las tablas incluyen `conjunto_id`, llaves compuestas de tenant y RLS forzado.
- `eventos_acceso_vehicular` es inmutable.
- La API valida entradas con Zod, resuelve la autorización y emite un evento auditable.
- El snapshot comercial replica la vista necesaria para la demostración; las entidades
  relacionales siguen siendo la base estructural del dominio.
- Comunidad separa responsabilidades: administración mantiene el inventario de parqueaderos y
  cada residente registra sus vehículos. Portería valida una placa y registra ingreso o salida.
- La función transaccional de alta obtiene persona y unidad desde `auth.uid()`, inserta el
  vehículo como autorizado y actualiza el snapshot y la auditoría sin recibir esos IDs del cliente.
