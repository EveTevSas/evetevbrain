-- Los avisos de calidad de datos los calcula la base, no quien escribe.
--
-- Motivo: hay dos formas de meter un producto —la importación y el panel— y
-- pronto habrá una tercera. Si cada una decide por su cuenta qué es un producto
-- incompleto, el listón depende de por dónde entró, y el panel acaba siendo el
-- agujero por el que se cuela lo que el import sí rechazaba.
--
-- Aquí se calculan solo los avisos que se DEDUCEN del dato. Los que dependen
-- del origen —«el texto traía afirmaciones terapéuticas», «el origen agrupaba
-- esto con otro producto»— no se pueden deducir y los sigue insertando el
-- importador; por eso se distinguen con la columna `origen`.

alter table tienda.aviso
  add column if not exists origen text not null default 'importacion'
    check (origen in ('importacion', 'automatico'));

-- Un aviso automático desaparece arreglando el dato, no marcándolo como
-- resuelto: es la diferencia entre una tarea y un síntoma.
create or replace function tienda.recalcular_avisos(p_slug text)
returns void language plpgsql as $$
declare p tienda.producto%rowtype;
begin
  select * into p from tienda.producto where slug = p_slug;
  if not found then return; end if;

  -- Se borran TODOS los automáticos, incluidos los marcados como resueltos.
  -- Si se respetara el «resuelto» de un aviso automático, alguien podría
  -- marcar «sin GTIN» como resuelto sin poner el GTIN y publicar igual. Un
  -- aviso automático no es una tarea que se cierra: es un síntoma que
  -- desaparece cuando el dato deja de faltar.
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
end $$;

create or replace function tienda.avisos_tras_escribir()
returns trigger language plpgsql as $$
begin
  perform tienda.recalcular_avisos(new.slug);
  return null;
end $$;

drop trigger if exists producto_recalcular_avisos on tienda.producto;
create trigger producto_recalcular_avisos
  after insert or update of descripcion, descripcion_por_confirmar, contenido, gtin, imagen
  on tienda.producto
  for each row execute function tienda.avisos_tras_escribir();
