-- Escenarios operativos para demostraciones comerciales de EveConecta.
--
-- El núcleo financiero y comunitario permanece normalizado en sus tablas.
-- Esta proyección JSON permite demostrar los módulos que aún están en fase de
-- validación comercial sin mezclar su dominio con EvePay ni crear datos globales.

create table conjuntos.escenarios_demo (
  conjunto_id uuid primary key
    references conjuntos.conjuntos(id) on delete cascade,
  snapshot jsonb not null,
  actualizado_en timestamptz not null default now(),
  constraint escenarios_demo_snapshot_objeto
    check (jsonb_typeof(snapshot) = 'object')
);

create trigger escenarios_demo_actualizar_timestamp
before update on conjuntos.escenarios_demo
for each row execute function conjuntos.actualizar_timestamp();

alter table conjuntos.escenarios_demo enable row level security;
alter table conjuntos.escenarios_demo force row level security;

create policy escenarios_demo_seleccionar
on conjuntos.escenarios_demo for select to authenticated
using (conjuntos.usuario_es_miembro(conjunto_id));

create policy escenarios_demo_insertar
on conjuntos.escenarios_demo for insert to authenticated
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

create policy escenarios_demo_actualizar
on conjuntos.escenarios_demo for update to authenticated
using (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
)
with check (
  conjuntos.usuario_tiene_rol(
    conjunto_id,
    array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
  )
);

grant select, insert, update on conjuntos.escenarios_demo
  to authenticated, service_role;
