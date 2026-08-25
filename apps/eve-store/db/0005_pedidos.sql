-- Pedidos.
--
-- Tres decisiones que conviene no deshacer, cada una con su motivo:
--
-- 1. **La línea congela el precio.** `precio_minor` y `nombre` son una copia
--    del momento de la compra, no una referencia al producto. Si mañana sube el
--    precio, el pedido de ayer tiene que seguir diciendo lo que se cobró — si
--    no, la contabilidad y el cliente dejan de coincidir.
--
-- 2. **Sin llaves foráneas hacia EvePay.** `evepay_cobro_id` es texto. Es la
--    regla de la constitución: los contextos se enlazan por ID, nunca por
--    referencia de base de datos, para que EvePay pueda mudarse de instancia
--    sin arrastrar a la tienda.
--
-- 3. **Las existencias las protege la base.** La resta va en la misma
--    transacción que crea el pedido, y el `check (existencias >= 0)` de
--    `producto` impide vender lo que no hay. Comprobarlo en la aplicación no
--    basta: entre leer y escribir cabe otra compra.

create type tienda.estado_pedido as enum (
  'pendiente_de_pago',  -- creado, esperando cobro
  'pagado',
  'cancelado'
);

create table if not exists tienda.pedido (
  id                bigserial primary key,
  -- Número legible para el cliente. Se enseña en la confirmación y en el
  -- correo; el `id` no sale nunca de la base.
  numero            text        not null unique,
  estado            tienda.estado_pedido not null default 'pendiente_de_pago',

  contacto_nombre   text        not null,
  contacto_correo   text        not null,
  contacto_telefono text,

  envio_direccion   text        not null,
  envio_ciudad      text        not null,
  envio_notas       text,

  -- Enteros en la unidad mínima, igual que EvePay. Para COP el valor face.
  subtotal_minor    bigint      not null check (subtotal_minor >= 0),
  envio_minor       bigint      not null default 0 check (envio_minor >= 0),
  total_minor       bigint      not null check (total_minor > 0),
  moneda            char(3)     not null default 'COP',

  -- Del cobro de EvePay, cuando exista. Texto, sin FK: ver decisión 2.
  evepay_cobro_id   text,

  creado_en         timestamptz not null default now()
);

create table if not exists tienda.pedido_linea (
  pedido_id     bigint  not null references tienda.pedido(id) on delete cascade,
  producto_slug text    not null,
  -- Copia del momento de la compra. Ver decisión 1.
  nombre        text    not null,
  precio_minor  bigint  not null check (precio_minor > 0),
  cantidad      integer not null check (cantidad > 0),
  primary key (pedido_id, producto_slug)
);

comment on column tienda.pedido_linea.precio_minor is
  'Precio al comprar, no el actual. Un pedido no cambia porque cambie el catálogo.';

-- Crea el pedido y descuenta existencias de una sola vez.
--
-- Está en la base y no en la aplicación por la misma razón que el disparador de
-- publicación: entre comprobar el stock desde fuera y escribirlo cabe otra
-- compra, y dos clientes se llevarían la última unidad. Aquí la resta y la
-- comprobación son la misma operación, y si algo falla no queda un pedido a
-- medias.
create or replace function tienda.crear_pedido(
  p_numero    text,
  p_nombre    text,
  p_correo    text,
  p_telefono  text,
  p_direccion text,
  p_ciudad    text,
  p_notas     text,
  p_envio     bigint,
  p_lineas    jsonb   -- [{"slug": "...", "cantidad": 2}]
) returns bigint language plpgsql as $$
declare
  v_id       bigint;
  v_subtotal bigint := 0;
  v_linea    jsonb;
  v_prod     tienda.producto%rowtype;
  v_cant     integer;
begin
  if jsonb_array_length(coalesce(p_lineas, '[]'::jsonb)) = 0 then
    raise exception 'El carrito está vacío.';
  end if;

  insert into tienda.pedido (
    numero, contacto_nombre, contacto_correo, contacto_telefono,
    envio_direccion, envio_ciudad, envio_notas, subtotal_minor, envio_minor, total_minor
  ) values (
    p_numero, p_nombre, p_correo, nullif(p_telefono, ''),
    p_direccion, p_ciudad, nullif(p_notas, ''), 0, p_envio, 1
  ) returning id into v_id;

  for v_linea in select * from jsonb_array_elements(p_lineas) loop
    v_cant := (v_linea->>'cantidad')::integer;

    -- `for update` bloquea la fila: si dos compras coinciden, la segunda espera
    -- y ve las existencias ya descontadas por la primera.
    select * into v_prod from tienda.producto
     where slug = v_linea->>'slug' and publicado for update;

    if not found then
      raise exception 'El producto «%» ya no está disponible.', v_linea->>'slug';
    end if;
    if v_cant > v_prod.existencias then
      raise exception 'Solo quedan % de «%».', v_prod.existencias, v_prod.nombre;
    end if;

    -- El precio se toma de la base, nunca de lo que mande el navegador.
    insert into tienda.pedido_linea (pedido_id, producto_slug, nombre, precio_minor, cantidad)
    values (v_id, v_prod.slug,
            coalesce(v_prod.nombre || ' ' || v_prod.contenido, v_prod.nombre),
            v_prod.precio_minor, v_cant);

    update tienda.producto set existencias = existencias - v_cant where slug = v_prod.slug;
    v_subtotal := v_subtotal + v_prod.precio_minor * v_cant;
  end loop;

  update tienda.pedido
     set subtotal_minor = v_subtotal, total_minor = v_subtotal + p_envio
   where id = v_id;

  return v_id;
end $$;
