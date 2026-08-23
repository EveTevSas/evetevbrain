alter table conjuntos.conjuntos
  add column if not exists funcionalidades_asamblea jsonb not null default jsonb_build_object(
    'document_repository', true,
    'delivery_tracking', true,
    'proxy_management', true,
    'identity_accreditation', true,
    'continuous_quorum', true,
    'unit_voting', true,
    'coefficient_voting', true,
    'qualified_majorities', true,
    'secret_ballots', true,
    'hybrid_participation', true,
    'resident_questions', true,
    'minutes_workflow', true,
    'decision_tracking', true
  );

alter table conjuntos.conjuntos
  add constraint conjuntos_funcionalidades_asamblea_objeto
  check (jsonb_typeof(funcionalidades_asamblea) = 'object') not valid;

alter table conjuntos.conjuntos
  validate constraint conjuntos_funcionalidades_asamblea_objeto;

alter table conjuntos.asambleas
  add column if not exists expediente jsonb not null default '{}'::jsonb;

alter table conjuntos.asambleas
  add constraint asambleas_expediente_objeto
  check (jsonb_typeof(expediente) = 'object') not valid;

alter table conjuntos.asambleas
  validate constraint asambleas_expediente_objeto;

comment on column conjuntos.conjuntos.funcionalidades_asamblea is
  'Matriz funcional de asambleas por copropiedad. Todas las capacidades nacen activas y la administración puede inactivar las no requeridas.';

comment on column conjuntos.asambleas.expediente is
  'Estado versionable del expediente: etapas, lista de control, convocatoria, poderes, votaciones, acta y seguimiento.';
