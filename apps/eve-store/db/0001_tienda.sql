-- Schema `tienda` — el dominio de Eve-Store.
--
-- Vive aparte de `evepay` y de `conjuntos` por la regla de la constitución: el
-- dominio de la vertical vive con la vertical. EvePay no sabe qué es un
-- producto, y esta tienda no lee tablas de `evepay`: pregunta por HTTP.
--
-- SIN llaves foráneas hacia otros schemas. El pedido guardará el id del cobro
-- de EvePay como texto, nunca como referencia de base.

create schema if not exists tienda;

-- ── Productos ──────────────────────────────────────────────────────────────
create table if not exists tienda.producto (
  slug                       text primary key,
  nombre                     text        not null,
  marca                      text        not null,

  -- Identidad entre sitios. Es lo que permite que un agente cruce este producto
  -- con el mismo producto en otro comercio; sin él somos un producto anónimo.
  gtin                       text unique,
  gtin_historicos            text[]      not null default '{}',

  -- Dinero en entero, en la unidad mínima, igual que EvePay (`amountMinor`).
  -- Para COP la unidad mínima ES el valor face: $52.000 se guarda como 52000.
  -- Guardarlo como pesos×100 mandaría a EvePay pedidos cien veces mayores.
  precio_minor               bigint      not null check (precio_minor > 0),
  moneda                     char(3)     not null default 'COP',

  contenido                  text,
  imagen                     text,

  descripcion                text,
  descripcion_por_confirmar  boolean     not null default true,

  -- Variables por categoría (tipo de piel, beneficios, zona, vegano…). Van en
  -- jsonb y no en columnas porque el conjunto cambia entre cosmética y
  -- suplementos, y porque son exactamente los campos que un agente compara.
  atributos                  jsonb       not null default '{}'::jsonb,

  existencias                integer     not null default 0 check (existencias >= 0),

  -- Nada sale a producción por defecto. Ver el disparador de más abajo.
  publicado                  boolean     not null default false,

  creado_en                  timestamptz not null default now(),
  actualizado_en             timestamptz not null default now()
);

comment on column tienda.producto.precio_minor is
  'Entero en unidad mínima, como EvePay. Para COP es el valor face: 52000 = $52.000.';

-- ── Avisos: lo que el panel tiene que resolver ────────────────────────────
-- No son notas sueltas: son la cola de trabajo del panel de administración, y
-- los bloqueantes impiden publicar. Un producto importado de Mercado Libre
-- llega con descripciones sin confirmar, contenido ausente y GTIN en conflicto;
-- que eso salga a la tienda sin que nadie lo mire es el fallo que este schema
-- existe para impedir.
create table if not exists tienda.aviso (
  id             bigserial primary key,
  producto_slug  text        not null references tienda.producto(slug) on delete cascade,
  texto          text        not null,
  bloqueante     boolean     not null default true,
  resuelto_en    timestamptz,
  resuelto_por   text,
  creado_en      timestamptz not null default now()
);

create index if not exists aviso_pendiente_idx
  on tienda.aviso (producto_slug) where resuelto_en is null;

-- ── Trazabilidad hacia el origen ──────────────────────────────────────────
create table if not exists tienda.origen_publicacion (
  producto_slug  text    not null references tienda.producto(slug) on delete cascade,
  publicacion_ml text    not null,
  estado_ml      text,
  vendidas       integer not null default 0,
  primary key (producto_slug, publicacion_ml)
);

-- ── Regla dura: no se publica con avisos bloqueantes sin resolver ─────────
-- Se hace en la base y no en la aplicación a propósito. Es la misma disciplina
-- que gobierna a Fluxi: ningún requisito se da por cumplido porque el código
-- «debería» cumplirlo. Un import, un script o un panel futuro pueden saltarse
-- una validación de aplicación; no pueden saltarse esto.
create or replace function tienda.impedir_publicar_con_avisos()
returns trigger language plpgsql as $$
declare pendientes integer;
begin
  if new.publicado and not coalesce(old.publicado, false) then
    -- Se recalculan los avisos automáticos ANTES de contar. Sin esto el
    -- guardia confía en un recuento que puede estar rancio: bastaba marcar los
    -- avisos como resueltos a mano y publicar sin tocar ninguna columna
    -- vigilada por el otro disparador. Comprobado — se publicó un producto sin
    -- GTIN, sin imagen y sin descripción. La regla se verifica en el instante
    -- en que se aplica, no en el último momento en que alguien tocó el dato.
    if to_regprocedure('tienda.recalcular_avisos(text)') is not null then
      perform tienda.recalcular_avisos(new.slug);
    end if;

    select count(*) into pendientes
      from tienda.aviso
     where producto_slug = new.slug and bloqueante and resuelto_en is null;
    if pendientes > 0 then
      raise exception
        'No se puede publicar «%»: tiene % aviso(s) bloqueante(s) sin resolver.',
        new.slug, pendientes;
    end if;
  end if;
  new.actualizado_en := now();
  return new;
end $$;

drop trigger if exists producto_antes_de_actualizar on tienda.producto;
create trigger producto_antes_de_actualizar
  before update on tienda.producto
  for each row execute function tienda.impedir_publicar_con_avisos();
