-- Cambiar el estado de un pedido, devolviendo el inventario si se cancela.
--
-- Estaba escrito como un `with` de varias CTE modificadoras y **no funcionaba**:
-- el pedido pasaba a cancelado y las unidades no volvían al inventario. Se
-- descubrió probándolo, no leyéndolo — el SQL parecía correcto. Aquí la lógica
-- va en una función, donde se lee en orden y se puede razonar.
--
-- Dos reglas que la función garantiza y una aplicación no puede:
--   · cancelar dos veces no devuelve el doble
--   · reabrir un pedido cancelado vuelve a descontar, y falla si ya no hay stock
create or replace function tienda.cambiar_estado_pedido(p_id bigint, p_estado text)
returns void language plpgsql as $$
declare
  v_antes tienda.estado_pedido;
  v_nuevo tienda.estado_pedido := p_estado::tienda.estado_pedido;
  v_linea record;
begin
  select estado into v_antes from tienda.pedido where id = p_id for update;
  if not found then raise exception 'No existe el pedido %.', p_id; end if;
  if v_antes = v_nuevo then return; end if;

  -- Se cancela: las unidades vuelven.
  if v_nuevo = 'cancelado' then
    for v_linea in select producto_slug, cantidad from tienda.pedido_linea where pedido_id = p_id loop
      update tienda.producto set existencias = existencias + v_linea.cantidad
       where slug = v_linea.producto_slug;
    end loop;
  end if;

  -- Se reabre algo que estaba cancelado: las unidades se vuelven a apartar. El
  -- `check (existencias >= 0)` de producto impide reabrir lo que ya no hay.
  if v_antes = 'cancelado' then
    for v_linea in select producto_slug, cantidad from tienda.pedido_linea where pedido_id = p_id loop
      update tienda.producto set existencias = existencias - v_linea.cantidad
       where slug = v_linea.producto_slug;
    end loop;
  end if;

  update tienda.pedido set estado = v_nuevo where id = p_id;
end $$;
