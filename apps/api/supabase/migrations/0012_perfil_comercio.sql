-- Perfil del comercio: lo que hay que conocer de quien va a mover dinero.
-- Spec: specs/evepay/merchant-onboarding/.
--
-- POR QUÉ EXISTE. Hasta ahora de un comercio se guardaba la razón social y un
-- nombre para mostrar. Con eso no se le puede dispersar la plata (no hay
-- cuenta), ni facturarle, ni notificarle nada, ni responder quién está detrás
-- si algo se investiga.
--
-- QUÉ SE PIDE Y POR QUÉ. El marco de conocimiento del cliente de la
-- Superintendencia Financiera exige, para una persona jurídica: nombre,
-- identificación, domicilio, BENEFICIARIO FINAL, representante legal, persona
-- de contacto con su cargo, y la fecha del proceso de conocimiento. EvePay
-- opera hoy como agregador bajo la cuenta de Evetev, así que la entidad
-- vigilada es el proveedor y no nosotros; pero Evetev responde ante él por sus
-- comercios, y pedir estos datos al dar de alta cuesta un formulario, mientras
-- que perseguirlos después sobre comercios que ya operan cuesta semanas.
--
-- POR QUÉ EN TABLA APARTE. identity.tenants es la raíz del aislamiento: la
-- referencian ledger, pagos y claves. Ensancharla con treinta columnas
-- descriptivas la vuelve pesada para lo que de verdad hace. El perfil es 1:1 y
-- se puede ir completando.

create table if not exists identity.perfil_comercio (
  tenant_id            uuid primary key references identity.tenants(id),

  -- ── Identificación ──────────────────────────────────────────────────────
  tipo_persona         text not null check (tipo_persona in ('natural', 'juridica')),
  nombre_comercial     text,
  tipo_documento       text not null check (tipo_documento in ('NIT', 'CC', 'CE', 'PA')),
  numero_documento     text not null,
  /* Dígito de verificación del NIT. Se guarda aparte porque se valida contra
     el número con el algoritmo de la DIAN: un NIT mal digitado es una cuenta
     que no cuadra y plata que no se puede dispersar. */
  digito_verificacion  text,
  /* Código CIIU de la actividad económica. Sale del RUT y es lo que el
     proveedor usa para clasificar el riesgo del comercio. */
  ciiu                 text,
  /* Responsable de IVA: cambia cómo se le factura. */
  responsable_iva      boolean not null default false,

  -- ── Domicilio ───────────────────────────────────────────────────────────
  direccion            text not null,
  ciudad               text not null,
  departamento         text not null,
  telefono             text,
  sitio_web            text,

  -- ── Correos, que no son el mismo ────────────────────────────────────────
  /* Operativo: aquí llegan avisos de cobros, fallos y cambios de estado.
     Suele ser de sistemas o de quien opera la plataforma. */
  correo_notificaciones text not null,
  /* Administrativo: aquí va la cuenta de cobro de Evetev. Suele ser de
     contabilidad, y mandarle avisos operativos a contabilidad es la forma más
     segura de que nadie los lea. */
  correo_facturacion   text not null,
  /* Solo si difiere del domicilio. */
  direccion_facturacion text,

  -- ── Representante legal (quien firma) ───────────────────────────────────
  rep_nombre           text not null,
  rep_tipo_documento   text not null check (rep_tipo_documento in ('CC', 'CE', 'PA')),
  rep_numero_documento text not null,
  rep_correo           text,
  rep_telefono         text,
  /* Persona expuesta políticamente. No descalifica: obliga a diligencia
     reforzada, así que hay que saberlo antes y no después. */
  rep_es_pep           boolean not null default false,

  -- ── Persona de contacto (a quien se llama) ──────────────────────────────
  /* Distinta del representante legal a propósito: el representante firma, pero
     quien contesta cuando un cobro falla un domingo es otro. La norma pide las
     dos, y la operación las necesita más todavía. */
  contacto_nombre      text not null,
  contacto_cargo       text,
  contacto_correo      text not null,
  contacto_telefono    text,

  -- ── Dónde se le dispersa la plata ───────────────────────────────────────
  banco                text,
  tipo_cuenta          text check (tipo_cuenta in ('ahorros', 'corriente')),
  numero_cuenta        text,
  titular_cuenta       text,
  /* El documento del titular debe coincidir con el del comercio. Dispersar a
     la cuenta de un tercero es exactamente lo que la norma persigue, y sin
     este campo no hay forma de comprobarlo. */
  titular_documento    text,

  -- ── Diligencia documental ───────────────────────────────────────────────
  /* No se guardan los archivos: se registra que alguien los vio y cuándo.
     Guardar RUT y cédulas es almacenar datos personales sensibles, con todo lo
     que arrastra; se decidirá cuando el volumen lo pida. Van uno por uno y no
     en un solo booleano porque "documentos verificados" no dice cuál faltó. */
  rut_verificado            boolean not null default false,
  camara_comercio_verificada boolean not null default false,
  cedula_rep_verificada     boolean not null default false,
  certificacion_bancaria_verificada boolean not null default false,
  verificado_en        timestamptz,
  verificado_por       text,

  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now()
);

/* Dos comercios con el mismo documento son casi siempre el mismo comercio dado
   de alta dos veces — y con dos juegos de claves cobrando en paralelo. */
create unique index if not exists perfil_comercio_documento_uq
  on identity.perfil_comercio (tipo_documento, numero_documento);

-- ---------------------------------------------------------------------------
-- Beneficiarios finales: quien tiene 5% o más del capital o de los derechos de
-- voto, o control efectivo aunque no figure como dueño. Son varios por
-- comercio, así que van en su propia tabla y no en columnas repetidas.
-- ---------------------------------------------------------------------------
create table if not exists identity.beneficiario_final (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references identity.tenants(id),
  nombre           text not null,
  tipo_documento   text not null check (tipo_documento in ('CC', 'CE', 'PA', 'NIT')),
  numero_documento text not null,
  participacion    numeric(5, 2) check (participacion >= 0 and participacion <= 100),
  es_pep           boolean not null default false,
  creado_en        timestamptz not null default now()
);

create index if not exists beneficiario_final_tenant_idx
  on identity.beneficiario_final (tenant_id);

create unique index if not exists beneficiario_final_documento_uq
  on identity.beneficiario_final (tenant_id, tipo_documento, numero_documento);

-- Ambas son cross-tenant para la consola: RLS activo, sin políticas, y se
-- entra solo por las funciones SECURITY DEFINER (mismo patrón que la
-- auditoría admin).
alter table identity.perfil_comercio enable row level security;
alter table identity.beneficiario_final enable row level security;

-- ---------------------------------------------------------------------------
-- Escritura: crea o reemplaza el perfil completo, beneficiarios incluidos, en
-- una sola operación. Si fueran dos, un comercio podría quedar con perfil y
-- sin beneficiarios, que se lee como "no tiene" en vez de "faltó guardarlos".
-- ---------------------------------------------------------------------------
create or replace function identity.admin_guardar_perfil_comercio(
  p_tenant uuid,
  p_perfil jsonb,
  p_beneficiarios jsonb default '[]'::jsonb
) returns void
language plpgsql
security definer
set search_path = identity, pg_temp
as $$
begin
  insert into identity.perfil_comercio (
    tenant_id, tipo_persona, nombre_comercial, tipo_documento, numero_documento,
    digito_verificacion, ciiu, responsable_iva, direccion, ciudad, departamento,
    telefono, sitio_web, correo_notificaciones, correo_facturacion,
    direccion_facturacion, rep_nombre, rep_tipo_documento, rep_numero_documento,
    rep_correo, rep_telefono, rep_es_pep, contacto_nombre, contacto_cargo,
    contacto_correo, contacto_telefono, banco, tipo_cuenta, numero_cuenta,
    titular_cuenta, titular_documento, rut_verificado, camara_comercio_verificada,
    cedula_rep_verificada, certificacion_bancaria_verificada, verificado_en,
    verificado_por
  )
  select
    p_tenant, p.tipo_persona, p.nombre_comercial, p.tipo_documento,
    p.numero_documento, p.digito_verificacion, p.ciiu,
    coalesce(p.responsable_iva, false), p.direccion, p.ciudad, p.departamento,
    p.telefono, p.sitio_web, p.correo_notificaciones, p.correo_facturacion,
    p.direccion_facturacion, p.rep_nombre, p.rep_tipo_documento,
    p.rep_numero_documento, p.rep_correo, p.rep_telefono,
    coalesce(p.rep_es_pep, false), p.contacto_nombre, p.contacto_cargo,
    p.contacto_correo, p.contacto_telefono, p.banco, p.tipo_cuenta,
    p.numero_cuenta, p.titular_cuenta, p.titular_documento,
    coalesce(p.rut_verificado, false), coalesce(p.camara_comercio_verificada, false),
    coalesce(p.cedula_rep_verificada, false),
    coalesce(p.certificacion_bancaria_verificada, false),
    p.verificado_en, p.verificado_por
  from jsonb_to_record(p_perfil) as p(
    tipo_persona text, nombre_comercial text, tipo_documento text,
    numero_documento text, digito_verificacion text, ciiu text,
    responsable_iva boolean, direccion text, ciudad text, departamento text,
    telefono text, sitio_web text, correo_notificaciones text,
    correo_facturacion text, direccion_facturacion text, rep_nombre text,
    rep_tipo_documento text, rep_numero_documento text, rep_correo text,
    rep_telefono text, rep_es_pep boolean, contacto_nombre text,
    contacto_cargo text, contacto_correo text, contacto_telefono text,
    banco text, tipo_cuenta text, numero_cuenta text, titular_cuenta text,
    titular_documento text, rut_verificado boolean,
    camara_comercio_verificada boolean, cedula_rep_verificada boolean,
    certificacion_bancaria_verificada boolean, verificado_en timestamptz,
    verificado_por text
  )
  on conflict (tenant_id) do update set
    tipo_persona = excluded.tipo_persona,
    nombre_comercial = excluded.nombre_comercial,
    tipo_documento = excluded.tipo_documento,
    numero_documento = excluded.numero_documento,
    digito_verificacion = excluded.digito_verificacion,
    ciiu = excluded.ciiu,
    responsable_iva = excluded.responsable_iva,
    direccion = excluded.direccion,
    ciudad = excluded.ciudad,
    departamento = excluded.departamento,
    telefono = excluded.telefono,
    sitio_web = excluded.sitio_web,
    correo_notificaciones = excluded.correo_notificaciones,
    correo_facturacion = excluded.correo_facturacion,
    direccion_facturacion = excluded.direccion_facturacion,
    rep_nombre = excluded.rep_nombre,
    rep_tipo_documento = excluded.rep_tipo_documento,
    rep_numero_documento = excluded.rep_numero_documento,
    rep_correo = excluded.rep_correo,
    rep_telefono = excluded.rep_telefono,
    rep_es_pep = excluded.rep_es_pep,
    contacto_nombre = excluded.contacto_nombre,
    contacto_cargo = excluded.contacto_cargo,
    contacto_correo = excluded.contacto_correo,
    contacto_telefono = excluded.contacto_telefono,
    banco = excluded.banco,
    tipo_cuenta = excluded.tipo_cuenta,
    numero_cuenta = excluded.numero_cuenta,
    titular_cuenta = excluded.titular_cuenta,
    titular_documento = excluded.titular_documento,
    rut_verificado = excluded.rut_verificado,
    camara_comercio_verificada = excluded.camara_comercio_verificada,
    cedula_rep_verificada = excluded.cedula_rep_verificada,
    certificacion_bancaria_verificada = excluded.certificacion_bancaria_verificada,
    verificado_en = excluded.verificado_en,
    verificado_por = excluded.verificado_por,
    actualizado_en = now();

  -- Los beneficiarios se reemplazan en bloque: la lista que llega es la
  -- composición actual del comercio, no un añadido a la anterior.
  delete from identity.beneficiario_final where tenant_id = p_tenant;

  insert into identity.beneficiario_final
    (tenant_id, nombre, tipo_documento, numero_documento, participacion, es_pep)
  select p_tenant, b.nombre, b.tipo_documento, b.numero_documento,
         b.participacion, coalesce(b.es_pep, false)
  from jsonb_to_recordset(coalesce(p_beneficiarios, '[]'::jsonb)) as b(
    nombre text, tipo_documento text, numero_documento text,
    participacion numeric, es_pep boolean
  );
end $$;

-- Lectura del perfil completo para la consola.
create or replace function identity.admin_perfil_comercio(p_tenant uuid)
returns table (perfil jsonb, beneficiarios jsonb)
language sql
security definer
set search_path = identity, pg_temp
stable
as $$
  select
    to_jsonb(p) - 'tenant_id' as perfil,
    coalesce((
      select jsonb_agg(to_jsonb(b) - 'tenant_id' order by b.participacion desc nulls last)
      from identity.beneficiario_final b where b.tenant_id = p_tenant
    ), '[]'::jsonb) as beneficiarios
  from identity.perfil_comercio p
  where p.tenant_id = p_tenant;
$$;

grant execute on function identity.admin_guardar_perfil_comercio(uuid, jsonb, jsonb) to evepay_api;
grant execute on function identity.admin_perfil_comercio(uuid) to evepay_api;

-- El listado marca si el perfil está o no, para verlo de un vistazo.
create or replace function identity.admin_comercios_con_perfil()
returns table (tenant_id uuid, tiene_perfil boolean, documento text, nombre_comercial text)
language sql
security definer
set search_path = identity, pg_temp
stable
as $$
  select t.id,
         (p.tenant_id is not null) as tiene_perfil,
         case when p.tenant_id is null then null
              else p.tipo_documento || ' ' || p.numero_documento
                   || coalesce('-' || p.digito_verificacion, '')
         end as documento,
         p.nombre_comercial
  from identity.tenants t
  left join identity.perfil_comercio p on p.tenant_id = t.id;
$$;

grant execute on function identity.admin_comercios_con_perfil() to evepay_api;

-- Buscar un comercio por su documento. Se usa para rechazar un alta duplicada
-- ANTES de crear el tenant: el índice único de arriba es la garantía, pero
-- salta a mitad del proceso y deja un tenant sin perfil ni claves.
create or replace function identity.admin_buscar_por_documento(
  p_tipo text,
  p_numero text
) returns table (tenant_id uuid)
language sql
security definer
set search_path = identity, pg_temp
stable
as $$
  select p.tenant_id
  from identity.perfil_comercio p
  where p.tipo_documento = p_tipo and p.numero_documento = p_numero
  limit 1;
$$;

grant execute on function identity.admin_buscar_por_documento(text, text) to evepay_api;
