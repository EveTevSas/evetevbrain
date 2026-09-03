# Consola de administración de EvePay

## Qué y por qué

EvePay ya tiene núcleo operable (pagos idempotentes, ledger, conciliación,
merchants, webhooks) pero su única cara administrativa es una página HTML servida
por la propia API en `/v1/admin`, protegida con un secreto compartido
(`X-Admin-Secret`). Eso alcanzó para el primer alta de comercios y ya se quedó
corta: no hay usuarios ni roles, no hay auditoría de quién hizo qué, y cada
sección nueva son cientos de líneas de HTML/JS a mano dentro de un `.ts`.

La consola es la herramienta del **equipo de Evetev** (rol `super_admin`) para
operar la pasarela: dar de alta comercios, vigilar los proveedores de
adquirencia, seguir los cobros y cuadrar el dinero. No es el portal de los
comercios (`admin_comercio` tendrá el suyo cuando el negocio lo pida, §1).

Decisiones ya tomadas (2-sep-2026):

- **App nueva** `apps/evepay-admin` (Next.js), consume la API por HTTP.
- **MVP con las cuatro secciones**: comercios+onboarding, proveedores, pagos,
  conciliación+ledger.
- Contexto de proveedor: la adquirencia negociada es **ComboPay** (spec
  `provider-combopay`); Akua queda implementado. ComboPay opera como agregador:
  sin alta de comercios ni settlements por API.

## Usuarios y acceso

Solo el equipo de Evetev. Auth con **Supabase Auth del proyecto EvePay** y rol
`super_admin` (identidad-rbac, Fase 0). El secreto compartido `X-Admin-Secret`
se retira al terminar la migración.

## Criterios de aceptación (EARS)

### A. Autenticación y auditoría

- CA-1: CUANDO un usuario sin sesión abre cualquier ruta de la consola, EL
  sistema DEBERÁ redirigirlo al login (patrón de login de `packages/brand`).
- CA-2: CUANDO un usuario autenticado NO tiene rol `super_admin`, EL sistema
  DEBERÁ negarle el acceso a toda la consola (403), sin filtrar qué existe.
- CA-3: CUANDO la consola llama a la API, EL sistema DEBERÁ autenticar con el
  JWT de Supabase (rol verificado por `RolesGuard`), no con `X-Admin-Secret`.
- CA-4: CUANDO un `super_admin` ejecuta una acción de escritura (crear
  comercio, rotar clave, reverificar un pago), EL sistema DEBERÁ registrar
  quién, qué y cuándo en la auditoría, y ese registro DEBERÁ ser inmutable.
- CA-5: CUANDO el registro de auditoría no puede escribirse, EL sistema DEBERÁ
  rechazar la acción (no hay acción admin sin rastro).

### B. Comercios y onboarding

- CA-6: CUANDO se lista comercios, EL sistema DEBERÁ mostrar por comercio:
  razón social, nombre, estado del tenant, estado KYC del merchant, prefijos y
  estado de sus API keys, y fecha de alta — nunca la clave completa.
- CA-7: CUANDO se crea un comercio, EL sistema DEBERÁ crear tenant + merchant +
  par de API keys (live y test) en una sola operación, y DEBERÁ mostrar las
  claves completas **una sola vez**, dejando claro que no se pueden recuperar.
- CA-8: CUANDO el proveedor activo no soporta alta por API (ComboPay), EL
  sistema DEBERÁ crear el comercio igualmente en EvePay y mostrar el paso
  manual pendiente en el proveedor, en vez de fallar el alta completa.
- CA-9: CUANDO se rota la API key de un comercio, EL sistema DEBERÁ generar la
  nueva, mostrarla una sola vez y desactivar la anterior de forma atómica.
- CA-10: CUANDO se desactiva un comercio, EL sistema DEBERÁ rechazar cobros
  nuevos de ese tenant manteniendo consultables su historial y su ledger.
- CA-23: CUANDO se abre la ficha de un comercio, EL sistema DEBERÁ mostrar sus
  datos completos —identificación, domicilio, correos, representante legal,
  persona de contacto, beneficiarios finales, cuenta de dispersión y estado de
  los documentos— y permitir editarlos, sin poder borrar el comercio: lo que
  toca dinero se desactiva, no se elimina.
- CA-24: CUANDO se lee un perfil y se vuelve a guardar sin cambios, EL sistema
  DEBERÁ aceptarlo. Lo que la API entrega tiene que poder volver a entrar.
- CA-22: CUANDO el proveedor activo no comunica la aprobación de comercios, EL
  sistema DEBERÁ permitir a un `super_admin` aprobar o rechazar el KYC desde la
  consola, auditando quién, desde qué estado y hacia cuál. Sin esto, con un
  proveedor agregador el comercio queda `en_revision` para siempre y —desde que
  cobrar exige estar aprobado— no podría cobrar nunca.

### C. Proveedores de pago

- CA-11: CUANDO se abre la sección de proveedores, EL sistema DEBERÁ mostrar
  los proveedores conocidos (fake, akua, combopay), cuál está **activo**
  (`PAYMENT_PROVIDER`), y por proveedor: qué credenciales están configuradas
  (presencia sí/no, jamás el valor), la URL de webhook esperada y sus
  capacidades (alta por API, settlements por API, monedas).
- CA-12: CUANDO se pide la prueba de salud del proveedor activo, EL sistema
  DEBERÁ ejecutar una verificación real de conectividad/credenciales contra el
  proveedor y mostrar el resultado con fecha y detalle del fallo si lo hay.
- CA-13: CUANDO el proveedor activo tiene pasos de habilitación pendientes
  (p. ej. ComboPay: token sin configurar, secreto de hook sin generar, URL de
  hook sin registrar en su dashboard, sandbox sin validar — T6 de
  `provider-combopay`), EL sistema DEBERÁ mostrar el checklist con el estado de
  cada paso.
- CA-14: CUANDO se consulta qué proveedor procesó un cobro, EL sistema DEBERÁ
  mostrarlo aunque el proveedor activo haya cambiado después (el histórico
  conserva su proveedor de origen).

### D. Pagos y cobros

- CA-15: CUANDO se listan cobros, EL sistema DEBERÁ mostrarlos cross-tenant
  con filtros por comercio, estado, rango de fechas y referencia, paginados,
  con montos siempre en la unidad mínima formateada (COP sin inventar
  decimales).
- CA-16: CUANDO se abre el detalle de un cobro, EL sistema DEBERÁ mostrar su
  línea de tiempo completa: transiciones de estado con actor (auditoría),
  eventos de webhook recibidos (incluidos los descartados por duplicado) y los
  asientos de ledger ligados.
- CA-17: CUANDO un `super_admin` pide reverificar un cobro, EL sistema DEBERÁ
  consultar el estado en el proveedor (`verificarEstado`) y aplicar la
  transición SOLO si la máquina de estados la permite, auditada con actor
  `admin:<usuario>`.
- CA-18: CUANDO una reverificación no cambia el estado, EL sistema DEBERÁ
  decirlo explícitamente (estado del proveedor y estado local), sin registrar
  transición alguna.

### E. Conciliación y ledger

- CA-19: CUANDO se ejecuta la conciliación de un rango para un comercio, EL
  sistema DEBERÁ mostrar el reporte (conciliados, diferencias, huérfanos del
  proveedor, no conciliados) y guardarlo con fecha de corrida para consulta
  posterior.
- CA-20: CUANDO el proveedor activo no expone liquidaciones por API (ComboPay,
  CA-8 de `provider-combopay`), EL sistema DEBERÁ mostrar ese estado como
  "conciliación manual" con el enlace al procedimiento, en vez de un reporte
  vacío que parezca cuadrado.
- CA-21: CUANDO se consulta el ledger de un comercio, EL sistema DEBERÁ
  mostrar los movimientos inmutables y el saldo **reconstruido desde los
  asientos**, y DEBERÁ señalar cualquier descuadre débito/crédito como
  incidente visible.

## Fuera de alcance (MVP)

- Portal de comercios (`admin_comercio`): consulta de sus propios cobros,
  claves y webhooks. Se especifica aparte cuando haya segundo comercio real.
- Gestión de refunds y disputas (Fase 6 del plan).
- Edición de configuración de proveedores desde la UI: los secretos se
  gestionan en Railway (§4); la consola solo muestra presencia y salud.
- Métricas/dashboards de negocio (volumen, conversión). Primero operar.
- Gestión de usuarios admin desde la UI (se aprovisionan como en EveConecta).
