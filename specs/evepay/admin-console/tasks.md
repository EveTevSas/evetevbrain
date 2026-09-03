# Tareas — Consola de administración de EvePay

Orden pensado para que cada fase deje algo usable. Cada tarea entra con sus
tests derivados de los CA que cita.

## Fase A — Fundación (sin esto no hay consola)

- [x] A1 — Scaffold `apps/evepay-admin`: Next.js + Supabase Auth (proyecto
      EvePay), login con el patrón de `packages/brand/patrones/login/`,
      layout con navegación de las 4 secciones, puerto 3004, `vercel.json`
      con `ignoreCommand`. (CA-1)
- [x] A2 — Guard de rol en la consola y en la API: proxy que exige
      `super_admin` en toda ruta (CA-2); job de CI para la app nueva
      (`scripts/ci-areas.sh` + workflow).
- [x] A3 — Migrar el acceso admin de `X-Admin-Secret` a JWT de Supabase con
      rol `super_admin` verificado en la API (CA-3; `supabase-jwt.ts` +
      `TenantMiddleware`). El header sigue aceptándose hasta F1.
- [x] A4 — Auditoría de acciones admin: `audit.admin_actions` inmutable con
      RLS sin políticas (solo se entra por funciones SECURITY DEFINER),
      `AdminAuditService.registrarEn(tx)` dentro de la transacción de cada
      acción, y `GET /v1/admin/auditoria` (CA-4, CA-5).
- [x] A5 — Script de aprovisionamiento de usuarios admin
      (`pnpm auth:provision-admin`, rol en app_metadata).

## Fase B — Comercios y onboarding

- [x] B1 — Listado de comercios con estado, KYC y prefijos de sus claves (CA-6).
- [x] B2 — Alta de comercio con las claves mostradas una sola vez (CA-7) y el
      paso manual señalado cuando el proveedor es agregador (CA-8). Requirió
      añadir `capacidades` al contrato `PaymentProvider`: preguntar antes de
      intentar, para no confundir "no lo ofrece" con "está caído".
- [x] B3 — Rotación de API key: revoca las anteriores y crea la nueva en una
      sola transacción, con la clave mostrada una vez (CA-9).
- [x] B4 — Activar/desactivar comercio (CA-10). El bloqueo de cobros nuevos se
      resolvió en `identity.validar_api_key`, que ahora exige que el tenant
      esté activo: es la única puerta por la que entra una API key, así que
      cubre también los endpoints futuros.

## Fase C — Proveedores

- [x] C1 — `GET /v1/admin/providers`: proveedor activo, capacidades y
      PRESENCIA de cada credencial —nunca su valor— (CA-11). El nombre del
      proveedor lo da el propio proveedor, así el histórico conserva quién
      procesó qué (CA-14).
- [x] C2 — `POST /v1/admin/providers/health`: comprobación real contra el
      proveedor activo (CA-12), añadida al contrato como `verificarSalud()`.
      fake = ok sin red; akua = token OAuth fresco (se salta la caché a
      propósito); combopay = `GET /api/invoice/0/status`, que exige el token.
      **No** `/api/bank-list`: resultó ser público y daba un falso "el token es
      válido" con credenciales inventadas. Cada comprobación queda auditada.
- [x] C3 — Checklist de habilitación (CA-13) con los pasos T6 de
      `provider-combopay`. Lo que no se puede verificar desde aquí se marca
      como manual con su nota, en vez de darlo por hecho.
- [x] C4 — UI de la sección: tarjeta por proveedor con capacidades,
      credenciales, forma de la URL del webhook, checklist y botón de
      comprobación en vivo.

## Fase D — Pagos y cobros

- [x] D1 — Listado cross-tenant con filtros (comercio, estado, referencia) y
      paginación por keyset, no por OFFSET: con OFFSET, insertar un cobro
      mientras alguien pagina desplaza las filas y se saltan registros, que en
      una lista de dinero se lee como un cobro perdido (CA-15).
- [x] D2 — Línea de tiempo del cobro (CA-16): transiciones con su actor,
      webhooks y asientos de ledger con sus líneas. Requirió dos columnas en
      `webhook_events`: `payment_id` —sin ella no se podía saber a qué cobro
      se refería un evento— y `recibido_veces`, porque un reenvío se
      descartaba en silencio y que un proveedor repita un evento es justo lo
      que se busca cuando algo va raro.
- [x] D3 — Reverificación manual contra el proveedor (CA-17, CA-18): aplica la
      transición solo si la máquina de estados la permite, y cuando no cambia
      nada lo dice sin registrar transición. Siempre auditada.

## Fase E — Conciliación y ledger

- [x] E1 — Conciliación por comercio y rango desde la consola, con histórico
      inmutable de corridas (CA-19). Cuando el proveedor no expone
      liquidaciones, la corrida se registra como `no_soportada` con su nota y
      las cifras en null (CA-20): guardar ceros se leería como "todo cuadra"
      cuando nadie comprobó nada.
- [x] E2 — Ledger por comercio con el saldo RECONSTRUIDO desde las líneas —no
      hay campo "saldo" que pueda quedar desactualizado— y alarma de descuadre
      global y por asiento (CA-21). Verificado inyectando un asiento corrupto
      en la base local: la alarma lo detectó y nombró.

  De paso se corrigió la cuenta de compensación del ledger, que estaba escrita
  a mano como `akua_clearing`. Con ComboPay activo el dinero en tránsito habría
  seguido cayendo en una cuenta con el nombre de un proveedor que no lo tiene,
  y con dos adquirencias sería imposible saber cuánto debe cada una. Ahora es
  `clearing:<proveedor>`; los asientos anteriores conservan su nombre, porque
  el ledger es inmutable y aquel dinero sí lo tenía Akua.

## Fase F — Cierre

- [x] F1 — Retirados `X-Admin-Secret`, `ADMIN_SECRET` y la página embebida
      `admin-page.ts` (392 líneas de HTML dentro de un `.ts`), junto con el
      `AdminUIController` y la exclusión del prefijo `/v1` que existía solo
      para servirla. Un test fija que la variable ya no abre nada, para que la
      puerta trasera no vuelva por descuido.
      De paso se quitó del `marca-sync` la maquinaria de activos incrustados:
      su único caso era esa página, y la consola sirve la marca desde su propia
      carpeta `/marca` como el resto de las apps.
- [x] F2 — Consola registrada en `docs/DESPLIEGUE.md` (proyecto Vercel, sus
      variables, cómo se aprovisionan los usuarios y el retiro de
      `ADMIN_SECRET`), en el `CLAUDE.md` raíz (mapa de apps, puerto 3004 y
      criterio de deploy sano) y en el README de la API.

## Posterior — decisión de negocio del 2-sep-2026

Se preguntó si un comercio sin registrar en el panel de ComboPay debería poder
cobrar. La respuesta fue **no**, y de ahí salieron tres cambios:

- [x] G1 — Crear un cobro exige que el comercio esté `aprobado` (409 en
      cualquier otro estado, antes de llamar al proveedor). La comprobación
      busca por (tenant, merchant), así que cierra de paso un hueco de
      integridad: el `merchantId` venía en el cuerpo y se persistía tal cual,
      sin comprobar que fuera de quien llamaba.
- [x] G2 — `POST /v1/admin/merchants/:tenantId/kyc` y su botón en la consola
      (CA-22). Es el único camino a `aprobado` con un proveedor agregador.
- [x] G3 — `specs/evepay/merchant-onboarding/` revisada: estaba escrita entera
      alrededor de Akua y su webhook. Ahora cubre los dos modelos y sube de 4
      a 8 criterios EARS.

  Se corrigió además el mismo bug del nombre del proveedor que ya se había
  arreglado en merchants: `PagosService` derivaba el proveedor de
  `PAYMENT_PROVIDER` con un ternario que solo conocía "akua", así que con
  ComboPay activo **cada cobro quedaba guardado como "fake"** — y ese es el
  campo contra el que después se concilia.

## Dependencias

- El PR `feat/provider-combopay` mergeado antes de C1–C3.
- Proyecto Supabase de EvePay con Auth habilitado antes de A1.
- La lista maestra de `docs/PLAN_DESARROLLO_EVEPAY.md` gana la fila
  `admin-console` (este spec).
