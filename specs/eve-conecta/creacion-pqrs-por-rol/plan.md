# Plan técnico

- Función `conjuntos.crear_caso_demo` (security definer) valida membresía, rol, longitudes
  y prioridad; para el residente deriva solicitante y unidad del padrón con `auth.uid()`.
- Las evidencias se verifican en la función: ruta bajo `conjunto/usuario/carga/N.ext` del
  creador y existencia real en `storage.objects` del bucket `eveconecta-case-images`.
- Políticas de storage: escritura y borrado bajo la carpeta propia para los cuatro roles;
  lectura completa solo para administración, propia para consejo y residente. El borrado
  de consejo/residente exige además que ningún caso referencie el archivo (helper
  security definer `evidencia_caso_referenciada`, porque esos roles no leen el snapshot).
- La unidad del residente se deriva con el mismo `order by` que usa la proyección de
  lectura, para que el caso creado siempre aparezca en la bandeja de su creador.
- Las etiquetas de prioridad de la interfaz reflejan los SLA reales (8/24/48 horas).
- `obtener_escenario_demo` filtra los casos del consejo por `createdBy` en lugar de
  vaciarlos; el residente conserva el filtro por unidad.
- El contrato `createCaseSchema` vuelve opcionales `requester` y `unit`; la API interna
  delega todos los roles en la función y elimina la mutación directa del snapshot.
- La interfaz oculta solicitante y unidad para el residente y elimina el nombre
  precargado del formulario.
