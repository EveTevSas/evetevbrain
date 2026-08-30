create or replace function conjuntos.soporte_asamblea_publicado(
  p_conjunto_id uuid,
  p_file_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    conjuntos.usuario_tiene_rol(
      p_conjunto_id,
      array['residente']::conjuntos.rol_miembro[]
    )
    and exists (
      select 1
      from conjuntos.escenarios_demo as escenario
      cross join lateral jsonb_array_elements(
        coalesce(escenario.snapshot -> 'assemblies', '[]'::jsonb)
      ) as asamblea(item)
      cross join lateral jsonb_array_elements(
        coalesce(asamblea.item #> '{dossier,documents}', '[]'::jsonb)
      ) as soporte(item)
      where escenario.conjunto_id = p_conjunto_id
        and soporte.item ->> 'filePath' = p_file_path
        and soporte.item ->> 'status' = 'published'
    );
$$;

revoke all on function conjuntos.soporte_asamblea_publicado(uuid, text) from public;
grant execute on function conjuntos.soporte_asamblea_publicado(uuid, text)
  to authenticated, service_role;

drop policy soportes_asamblea_consultar on storage.objects;

create policy soportes_asamblea_consultar
on storage.objects for select to authenticated
using (
  bucket_id = 'eveconecta-assembly-supports'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and (
        miembro.rol = any (
          array['super_admin', 'admin_conjunto', 'consejo']::conjuntos.rol_miembro[]
        )
        or conjuntos.soporte_asamblea_publicado(miembro.conjunto_id, name)
      )
  )
);

drop policy soportes_asamblea_insertar on storage.objects;

create policy soportes_asamblea_insertar
on storage.objects for insert to authenticated
with check (
  bucket_id = 'eveconecta-assembly-supports'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/v[1-9][0-9]*\.(pdf|docx|xlsx|jpg|png)$'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any (
        array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
      )
  )
);

drop policy soportes_asamblea_eliminar_carga_fallida on storage.objects;

create policy soportes_asamblea_eliminar_carga_fallida
on storage.objects for delete to authenticated
using (
  bucket_id = 'eveconecta-assembly-supports'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any (
        array['super_admin', 'admin_conjunto']::conjuntos.rol_miembro[]
      )
  )
);
