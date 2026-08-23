-- Quién puede usar el panel.
--
-- Hace falta una lista explícita porque **la base de autenticación es
-- compartida**: los mismos `auth.users` sirven a EveConecta, y entre ellos hay
-- residentes de conjuntos residenciales. Si el panel se conformara con «¿inició
-- sesión?», un residente podría entrar a cambiar los precios de la tienda.
-- Autenticar no es autorizar.
--
-- La comprobación vive en la aplicación y no en RLS, y el motivo es concreto:
-- el panel se conecta como `postgres`, que es el dueño de estas tablas y por
-- tanto se salta las políticas de fila. Poner aquí una RLS daría una sensación
-- de seguridad que no se sostiene.

create table if not exists tienda.administrador (
  usuario_id uuid        primary key,
  correo     text        not null,
  creado_en  timestamptz not null default now()
);

comment on table tienda.administrador is
  'Lista de acceso al panel. auth.users es compartido con EveConecta: estar autenticado no basta.';

-- Se siembra solo la cuenta real de la compañía. Las cuentas demo.* de
-- EveConecta y los residentes quedan fuera a propósito.
insert into tienda.administrador (usuario_id, correo)
select id, email from auth.users where email = 'contacto@evetev.com'
on conflict (usuario_id) do nothing;
