insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'eveconecta-assembly-supports',
  'eveconecta-assembly-supports',
  false,
  15728640,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
        or (
          miembro.rol = 'residente'::conjuntos.rol_miembro
          and exists (
            select 1
            from conjuntos.escenarios_demo as escenario
            cross join lateral jsonb_array_elements(
              coalesce(escenario.snapshot -> 'assemblies', '[]'::jsonb)
            ) as asamblea(item)
            cross join lateral jsonb_array_elements(
              coalesce(asamblea.item #> '{dossier,documents}', '[]'::jsonb)
            ) as soporte(item)
            where escenario.conjunto_id = miembro.conjunto_id
              and soporte.item ->> 'filePath' = name
              and soporte.item ->> 'status' = 'published'
          )
        )
      )
  )
);

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
        array['super_admin', 'admin_conjunto', 'consejo']::conjuntos.rol_miembro[]
      )
  )
);

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
        array['super_admin', 'admin_conjunto', 'consejo']::conjuntos.rol_miembro[]
      )
  )
);
