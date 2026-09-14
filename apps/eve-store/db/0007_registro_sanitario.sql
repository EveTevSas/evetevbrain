-- Registro sanitario del INVIMA como dato del producto, no como una línea
-- perdida dentro de la descripción.
--
-- Estaba solo en el texto, y en 17 de 25 fichas no aparecía. En un campo propio
-- la ficha lo muestra siempre en el mismo sitio, el panel lo pide, y quien lo
-- necesita lo lee sin interpretar prosa: el verificador del blog reconoce un
-- suplemento dietario por el prefijo SD, que es lo que prohíbe enlazarlo desde
-- un artículo (Decreto 3249 de 2006).
--
-- Formas que tiene en el catálogo: NSOC78812-17CO (notificación sanitaria de un
-- cosmético), PSA-001738-2018 (alimento), SD2009-0001168 (suplemento dietario).
-- El `check` no valida contra el INVIMA —desde aquí no se puede—; solo impide lo
-- que seguro no es un registro: minúsculas, espacios, una frase pegada por error.

alter table tienda.producto add column if not exists registro_sanitario text;

alter table tienda.producto drop constraint if exists producto_registro_sanitario_formato;
alter table tienda.producto add constraint producto_registro_sanitario_formato
  check (registro_sanitario ~ '^[A-Z]{2,5}-?[0-9][0-9A-Z-]{3,30}$');

-- La función de 0002, con un aviso más. Sin registro no se publica: en Colombia
-- un cosmético, un alimento de marca o un suplemento no se puede vender sin él.
-- Como todo aviso bloqueante, frena la PUBLICACIÓN; no retira lo que ya está
-- publicado (ver `impedir_publicar_con_avisos` en 0001).
create or replace function tienda.recalcular_avisos(p_slug text)
returns void language plpgsql as $$
declare p tienda.producto%rowtype;
begin
  select * into p from tienda.producto where slug = p_slug;
  if not found then return; end if;

  -- Se borran TODOS los automáticos, incluidos los marcados como resueltos: un
  -- aviso automático no es una tarea que se cierra, es un síntoma que
  -- desaparece cuando el dato deja de faltar (ver 0002).
  delete from tienda.aviso
   where producto_slug = p_slug and origen = 'automatico';

  if p.descripcion is null or length(trim(p.descripcion)) < 150 then
    insert into tienda.aviso (producto_slug, texto, origen) values (p_slug,
      'la descripción no llega a 150 caracteres; por debajo de eso el producto no compite en los canales',
      'automatico');
  end if;

  if p.descripcion_por_confirmar then
    insert into tienda.aviso (producto_slug, texto, origen) values (p_slug,
      'la descripción está sin confirmar; alguien de la compañía tiene que leerla antes de publicar',
      'automatico');
  end if;

  if p.contenido is null or trim(p.contenido) = '' then
    insert into tienda.aviso (producto_slug, texto, origen) values (p_slug,
      'sin contenido declarado; en cosmética es lo que permite comparar precio entre presentaciones',
      'automatico');
  end if;

  if p.gtin is null or trim(p.gtin) = '' then
    insert into tienda.aviso (producto_slug, texto, origen) values (p_slug,
      'sin GTIN; es lo que permite que un agente cruce este producto con el mismo producto en otro sitio',
      'automatico');
  end if;

  if p.imagen is null or trim(p.imagen) = '' then
    insert into tienda.aviso (producto_slug, texto, origen) values (p_slug,
      'sin imagen; los canales de compra exigen al menos una',
      'automatico');
  end if;

  if p.registro_sanitario is null then
    insert into tienda.aviso (producto_slug, texto, origen) values (p_slug,
      'sin registro sanitario; un cosmético, un alimento de marca o un suplemento no se puede vender en Colombia sin su registro o notificación del INVIMA',
      'automatico');
  end if;
end $$;

drop trigger if exists producto_recalcular_avisos on tienda.producto;
create trigger producto_recalcular_avisos
  after insert or update of descripcion, descripcion_por_confirmar, contenido, gtin, imagen, registro_sanitario
  on tienda.producto
  for each row execute function tienda.avisos_tras_escribir();

-- Los productos que ya existían no han pasado por el disparador con la regla
-- nueva: sin esto, el aviso no aparecería hasta que alguien tocara cada ficha.
select tienda.recalcular_avisos(slug) from tienda.producto;
