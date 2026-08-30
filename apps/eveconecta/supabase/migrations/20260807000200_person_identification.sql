alter table conjuntos.personas
  add column tipo_identificacion text,
  add column numero_identificacion text;

alter table conjuntos.personas
  add constraint personas_identificacion_completa check (
    (tipo_identificacion is null and numero_identificacion is null)
    or (tipo_identificacion is not null and numero_identificacion is not null)
  ),
  add constraint personas_tipo_identificacion_valido check (
    tipo_identificacion is null
    or tipo_identificacion in (
      'cc',
      'ti',
      'ce',
      'passport',
      'ppt',
      'civil_registry',
      'nit',
      'other'
    )
  );

alter table conjuntos.personas
  drop constraint personas_anonimizacion_consistente,
  add constraint personas_anonimizacion_consistente check (
    anonimizada_en is null
    or (
      nombre is null
      and tipo_identificacion is null
      and numero_identificacion is null
      and email is null
      and telefono is null
    )
  );

create unique index personas_conjunto_identificacion_unica
  on conjuntos.personas(conjunto_id, tipo_identificacion, numero_identificacion)
  where numero_identificacion is not null and anonimizada_en is null;
