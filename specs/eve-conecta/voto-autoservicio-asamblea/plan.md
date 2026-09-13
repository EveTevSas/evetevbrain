# Plan técnico

## Datos

- `conjuntos.asamblea_votos` gana atribución dual, porque un voto por autoservicio no
  siempre tiene un `auth.uid()` detrás (regla 3 del spec):
  - `registrado_por_usuario_id` pasa a nullable (hoy es `not null`).
  - Nueva columna `acreditacion_id uuid` (nullable, FK compuesta a
    `asamblea_acreditaciones(conjunto_id, id)`): se llena siempre que el voto es
    autoservicio (con o sin cuenta), identifica exactamente qué acreditación —y por
    tanto qué persona— lo emitió.
  - Constraint `asamblea_votos_origen_consistente`: `registrado_por_usuario_id is not
    null or acreditacion_id is not null` (todo voto declara su origen).
  - Mismo patrón dual en la revocación: `revocado_por_acreditacion_id` nullable junto
    al ya existente `revocado_por_usuario_id`, con la misma regla de "al menos uno".
- Nueva tabla `conjuntos.asamblea_acreditacion_tokens`: `id`, `conjunto_id`,
  `asamblea_id`, `acreditacion_id` (FK compuesta), `token_hash` (nunca se guarda el
  token en claro — mismo principio que un reset de contraseña), `creado_por_usuario_id`,
  `creado_en`, `revocado_en` (para que administración invalide un enlace filtrado).
  Un token no expira por sí solo ni se consume al usarse — su validez la determina en
  cada llamada el estado de la asamblea (`en_curso`) y de la acreditación (activa), no
  el token; esto es lo que le permite a un apoderado con varias unidades usar el mismo
  enlace para votar cada punto que le corresponda durante toda la sesión.
- No cambia la estructura de `asamblea_orden_dia` ni el cálculo de resultado — ambos
  canales alimentan la misma tabla de votos y el mismo `cerrar_votacion_punto_demo`.

## Funciones (security definer)

- `votar_autoservicio_asamblea_demo(p_conjunto_id, p_asamblea_id, p_punto_id,
  p_acreditacion_id, p_opcion)`: para asistentes con cuenta en el portal. Exige
  `auth.uid()` autenticado; valida que la acreditación indicada le pertenezca
  (`acreditacion.persona_id` con `personas.auth_usuario_id = auth.uid()`), esté activa,
  y sea de calidad `propietario`/`apoderado`. El parámetro de acreditación es explícito
  (no se infiere "la unidad del usuario") porque una misma persona puede tener más de
  una acreditación activa en la misma asamblea (la suya y la de quien representa).
- `votar_con_token_asamblea_demo(p_token, p_punto_id, p_opcion)`: para asistentes sin
  cuenta. No valida rol de aplicación — valida el hash del token contra
  `asamblea_acreditacion_tokens`, que no esté revocado, y que la acreditación asociada
  siga activa; se otorga ejecución también a `anon`, no solo a `authenticated`, porque
  quien llega por el enlace no inicia sesión.
- Ambas comparten el núcleo de validación de `votar_punto_orden_dia_demo` (votación
  abierta, asamblea `en_curso`, coeficiente congelado en la acreditación) y difieren
  solo en cómo resuelven la identidad de quien vota y en que escriben
  `acreditacion_id` en vez de (o además de) `registrado_por_usuario_id`.
- Reconciliación (regla 5 del spec): antes de insertar, si ya existe un voto activo
  para `(punto_id, unidad_id)` **registrado por la mesa** (`acreditacion_id is null`),
  se revoca automáticamente y se inserta el del asistente. Si ya existe uno
  autoservicio de la **misma** acreditación (cambió de opinión antes de cerrar), se
  revoca y se reemplaza igual — mismo patrón "revocar y volver a registrar" de
  `votacion-real-asamblea`. Si el voto activo es autoservicio de una acreditación
  **distinta**, se rechaza como conflicto (no debería ocurrir si la acreditación de esa
  unidad es única a la vez, pero no se asume).
- `generar_enlace_voto_demo(p_conjunto_id, p_asamblea_id, p_acreditacion_id)`: exige rol
  admin; genera un token aleatorio de alta entropía, guarda su hash, devuelve el token
  en claro **una sola vez** en la respuesta (como cualquier secreto emitido).
- `revocar_enlace_voto_demo(p_conjunto_id, p_asamblea_id, p_acreditacion_id)`: exige rol
  admin; invalida el enlace vigente de esa acreditación.
- `listar_votaciones_asamblea_demo` no cambia de forma — sigue agregando desde
  `asamblea_votos` sin importar el canal de origen.

## API y proveedor de datos

- Rutas autenticadas nuevas (dentro de `/api/v1/habitat/`, mismo patrón que hoy):
  `POST assemblies/:id/agenda/:itemId/votes/self` (autoservicio con cuenta),
  `POST/DELETE assemblies/:id/accreditations/:accreditationId/vote-link` (generar y
  revocar enlace, admin).
- Ruta pública nueva, **fuera** de `/v1/habitat/` porque no requiere sesión de
  Supabase: `POST /api/v1/public/asamblea-voto` — recibe `{token, puntoId, opcion}`,
  llama `votar_con_token_asamblea_demo` con el cliente de Supabase autenticado con la
  clave anónima (no service role: el RPC ya hace su propia validación de autorización
  vía el token, no hay que saltarse RLS).
- `AssemblyWorkspace`: en la etapa `live`, además del fetch ya existente de
  `listar_votaciones`, resuelve si el usuario autenticado tiene alguna acreditación
  propia con un punto abierto sin voto — mismo patrón de estado/efecto que el resto de
  etapas, pero evaluado también para roles no admin (hoy la mayoría de fetches de esta
  vista son `canManage`-gated).

## Interfaz

- `app/votar/[token]/page.tsx` nueva: página independiente, fuera del layout del
  portal (sin sidebar ni sesión requerida). Muestra el nombre de la unidad y persona
  representada, los puntos abiertos pendientes de esa acreditación con Sí/No/Abstención,
  y tras votar confirma "Tu voto: <opción>" — visible siempre, incluso con
  `secret_ballots` activo (regla 6).
- `LiveStage`/`AssemblyVotingPanel`: nuevo aviso "Vota ahora" para el asistente
  autenticado con una acreditación propia y un punto abierto sin voto — independiente
  del formulario de registro por mesa, que sigue existiendo tal cual para `canManage`.
- Etapa de Acreditación (`RegistrationStage`): por cada acreditación activa, acción
  "Generar enlace de voto" (admin) que muestra el enlace/QR resultante una sola vez
  (igual que cualquier secreto — si se pierde, se revoca y se genera uno nuevo, nunca
  se vuelve a mostrar el mismo).
- El generador del código QR en sí (renderizado visual del enlace) es un detalle de
  implementación de esa misma pantalla, no una pieza de dominio nueva.

## Pruebas

- pgTAP: autoservicio con cuenta exige que la acreditación pertenezca al usuario
  autenticado y sea de calidad con voto; un apoderado con dos unidades vota cada una
  por separado; autoservicio reemplaza un voto de mesa previo para la misma unidad;
  autoservicio de la misma acreditación reemplaza su propio voto previo; autoservicio
  de una acreditación distinta sobre un voto autoservicio activo es rechazado; el
  token debe corresponder a una acreditación activa y a una asamblea `en_curso`, y un
  token revocado o de otro conjunto se rechaza; el voto por token dispara la misma
  validación de punto abierto/cerrado que el resto; aislamiento entre conjuntos tanto
  en votos como en tokens.
- Vitest: schemas Zod nuevos (voto por token, generación/revocación de enlace).
