-- El pago de una obligación corresponde al residente de la unidad. La función
-- conserva el escenario completo y modifica únicamente la cuota autorizada,
-- evitando que una proyección filtrada sobrescriba datos de otros residentes.

create function conjuntos.pagar_obligacion_demo(
  p_conjunto_id uuid,
  p_fee_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role conjuntos.rol_miembro;
  v_unit text;
  v_resident_name text;
  v_snapshot jsonb;
  v_fee jsonb;
  v_updated_fees jsonb;
  v_updated_audit jsonb;
  v_balance_minor bigint;
  v_now timestamptz := clock_timestamp();
  v_payment_id uuid := gen_random_uuid();
  v_payment jsonb;
  v_audit_entry jsonb;
begin
  select miembro.rol
    into v_role
  from conjuntos.miembros_conjunto as miembro
  where miembro.conjunto_id = p_conjunto_id
    and miembro.usuario_id = auth.uid()
    and miembro.activo
  limit 1;

  if v_role is distinct from 'residente'::conjuntos.rol_miembro then
    raise insufficient_privilege
      using message = 'Solo los residentes pueden iniciar pagos';
  end if;

  select unidad.codigo, persona.nombre
    into v_unit, v_resident_name
  from conjuntos.personas as persona
  inner join conjuntos.personas_unidades as vinculo
    on vinculo.conjunto_id = persona.conjunto_id
    and vinculo.persona_id = persona.id
  inner join conjuntos.unidades as unidad
    on unidad.conjunto_id = vinculo.conjunto_id
    and unidad.id = vinculo.unidad_id
  where persona.conjunto_id = p_conjunto_id
    and persona.auth_usuario_id = auth.uid()
    and persona.anonimizada_en is null
    and vinculo.vigente_desde <= current_date
    and (vinculo.vigente_hasta is null or vinculo.vigente_hasta >= current_date)
  order by vinculo.responsable_pago desc, vinculo.vigente_desde
  limit 1;

  if v_unit is null then
    raise insufficient_privilege
      using message = 'El residente no tiene una unidad vigente';
  end if;

  select escenario.snapshot
    into v_snapshot
  from conjuntos.escenarios_demo as escenario
  where escenario.conjunto_id = p_conjunto_id
  for update;

  if v_snapshot is null then
    raise exception using message = 'El escenario de demostración no existe';
  end if;

  select item
    into v_fee
  from jsonb_array_elements(coalesce(v_snapshot -> 'fees', '[]'::jsonb)) as fee(item)
  where item ->> 'id' = p_fee_id::text
    and item ->> 'unit' = v_unit
  limit 1;

  if v_fee is null then
    raise exception using message = 'La obligación no existe para la unidad del residente';
  end if;

  v_balance_minor := coalesce((v_fee ->> 'balanceMinor')::bigint, 0);
  if v_balance_minor <= 0 then
    raise exception using message = 'La obligación ya fue pagada';
  end if;

  select jsonb_agg(
    case
      when item ->> 'id' = p_fee_id::text then
        jsonb_set(
          jsonb_set(item, '{balanceMinor}', '0'::jsonb),
          '{status}',
          to_jsonb('paid'::text)
        )
      else item
    end
  )
    into v_updated_fees
  from jsonb_array_elements(v_snapshot -> 'fees') as fee(item);

  v_payment := jsonb_build_object(
    'id', v_payment_id,
    'tenantId', p_conjunto_id,
    'merchantId', p_conjunto_id,
    'reference', p_fee_id,
    'amountMinor', v_balance_minor,
    'currency', 'COP',
    'description', v_fee ->> 'concept',
    'status', 'approved',
    'provider', 'mock',
    'providerPaymentId', 'demo-' || v_payment_id::text,
    'checkoutUrl', '',
    'createdAt', v_now,
    'updatedAt', v_now
  );

  v_audit_entry := jsonb_build_object(
    'id', gen_random_uuid(),
    'occurredAt', v_now,
    'actor', v_resident_name,
    'action', 'finanzas.pago_sandbox_aplicado',
    'resource', p_fee_id,
    'detail', v_unit || ': pago de demostración aplicado',
    'result', 'success'
  );

  select coalesce(jsonb_agg(entry order by position), '[]'::jsonb)
    into v_updated_audit
  from jsonb_array_elements(
    jsonb_build_array(v_audit_entry) || coalesce(v_snapshot -> 'audit', '[]'::jsonb)
  ) with ordinality as audit(entry, position)
  where position <= 40;

  update conjuntos.escenarios_demo
  set snapshot = jsonb_set(
        jsonb_set(v_snapshot, '{fees}', v_updated_fees),
        '{audit}',
        v_updated_audit
      ),
      actualizado_en = v_now
  where conjunto_id = p_conjunto_id;

  return v_payment;
end;
$$;

revoke all on function conjuntos.pagar_obligacion_demo(uuid, uuid) from public;
grant execute on function conjuntos.pagar_obligacion_demo(uuid, uuid)
  to authenticated, service_role;
