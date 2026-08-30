-- Solo el rol de servicio puede eliminar registros durante operaciones ARCO o
-- restauraciones controladas del escenario. Los usuarios autenticados conservan
-- exclusivamente la inactivación para no perder el historial.
grant delete on conjuntos.mascotas to service_role;
