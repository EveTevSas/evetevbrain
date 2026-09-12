# Hub de Evetev — base: acceso, propiedad de datos y Cuenta canónica

Torre de control de **la compañía** (no de EvePay). Arquitectura de fondo:
`docs/ARQUITECTURA_HUB_EVETEV.md`. Esta spec cubre lo que no es
presentacional: quién entra, qué datos posee el Hub y cómo se representa un
mismo cliente entre productos.

## Decisiones (11-sep-2026)

- **Auth:** el proyecto Supabase de EvePay, con **Google** como proveedor. El
  equipo tiene una identidad y el Hub llama a la API de EvePay con el JWT de
  la persona (su rol interno decide qué ve allá). Sin cuentas de servicio.
- **Quién entra:** cualquier cuenta de Google cuyo correo sea de un dominio
  permitido (`evetev.com`; lista en `HUB_DOMINIOS_PERMITIDOS`). En local se
  admite además correo + contraseña, porque Google no corre sin credenciales.
- **Datos propios:** schema `hub` en la misma base, accedido por el rol
  `hub_app`, que **no tiene permisos** sobre los schemas de EvePay
  (`evepay`, `identity`, `audit`). La frontera la hacen los GRANT.
- **Cuenta canónica:** contrato en `@evetev/shared` (`cuenta-canonica.ts`);
  tablas `hub.cuentas` y `hub.enlaces_producto` en el Hub. EvePay no la conoce.
- **Roll-ups:** solo lectura, por HTTP (`GET /v1/admin/*`). El Hub jamás lee
  las tablas de EvePay.

## Criterios de aceptación (EARS)

- **CA-1** CUANDO alguien sin sesión pida cualquier ruta del Hub, EL sistema
  DEBERÁ redirigir a `/login` conservando la ruta pedida si es interna.
- **CA-2** CUANDO una persona autenticada tenga un correo fuera de los dominios
  permitidos, EL sistema DEBERÁ mostrarle solo `/sin-acceso`, sin revelar qué
  hay adentro.
- **CA-3** CUANDO el rol `hub_app` intente leer una tabla de `evepay`,
  `identity` o `audit`, LA base DEBERÁ negarlo (permission denied).
- **CA-4** CUANDO se guarde un enlace de producto sin mensualidad ni faceta de
  pagos, o uno de EvePay con mensualidad, EL contrato DEBERÁ rechazarlo.
- **CA-5** CUANDO el Hub calcule el ingreso de una Cuenta, EL sistema DEBERÁ
  sumar el MRR de sus suscripciones activas más la comisión de su
  `evepayTenantId` **una sola vez**, aunque varios productos apunten al mismo
  tenant.
- **CA-6** CUANDO se enlace un producto a un NIT que ya tiene Cuenta, EL
  sistema DEBERÁ usar esa Cuenta en vez de crear otra (NIT único).
- **CA-7** CUANDO se cree, cambie o borre algo que posee el Hub, EL sistema
  DEBERÁ dejar rastro en `hub.auditoria` con actor, acción y detalle.
- **CA-8** MIENTRAS la API de EvePay no responda, EL Hub DEBERÁ seguir
  mostrando sus datos propios y marcar los roll-ups como no disponibles.

## Fuera de alcance

MRR real de EveConecta y EveLedger por API (hoy se registra en el enlace),
churn e indicadores que exigen histórico, y el módulo Documentos más allá de
enlaces.
