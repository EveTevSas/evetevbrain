insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'eveconecta-case-images',
  'eveconecta-case-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy casos_imagenes_consultar
on storage.objects for select to authenticated
using (
  bucket_id = 'eveconecta-case-images'
  and exists (
    select 1
    from conjuntos.miembros_conjunto as miembro
    where miembro.conjunto_id::text = (storage.foldername(name))[1]
      and miembro.usuario_id = auth.uid()
      and miembro.activo
      and miembro.rol = any (
        array[
          'super_admin',
          'admin_conjunto',
          'consejo',
          'residente'
        ]::conjuntos.rol_miembro[]
      )
  )
);

create policy casos_imagenes_insertar_administracion
on storage.objects for insert to authenticated
with check (
  bucket_id = 'eveconecta-case-images'
  and (storage.foldername(name))[2] = auth.uid()::text
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[1-3]\.(jpg|png|webp)$'
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

create policy casos_imagenes_eliminar_administracion
on storage.objects for delete to authenticated
using (
  bucket_id = 'eveconecta-case-images'
  and (storage.foldername(name))[2] = auth.uid()::text
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
