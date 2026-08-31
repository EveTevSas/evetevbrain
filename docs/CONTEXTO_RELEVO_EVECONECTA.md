# Contexto y relevo técnico de EveConecta

> Documento de continuidad para una persona o asistente de IA que vaya a seguir
> desarrollando EveConecta. Estado verificado el **30 de agosto de 2026**.
>
> Este archivo no contiene contraseñas, tokens ni claves. Los secretos deben
> obtenerse del responsable del proyecto y cargarse únicamente en los gestores
> autorizados o en archivos locales ignorados por Git.

## 1. Resumen ejecutivo

**EveConecta** es la vertical de Evetev para la gestión operativa y el recaudo de
copropiedades residenciales. Vive dentro del monorepo de Evetev y consume la
plataforma de pagos EvePay por HTTP.

- Repositorio: <https://github.com/EveTevSas/evetevbrain.git>
- Carpeta canónica de la aplicación: `apps/eveconecta`
- Rama de trabajo acordada: `conecta`
- Dominio productivo: <https://conecta.evetev.com>
- Supabase productivo: proyecto `Eveconecta`, referencia
  `jmwiydbyngqbaieheeeh`
- Schema Postgres propio: `conjuntos`
- Aplicación local: <http://localhost:3002>
- Supabase Studio local: <http://127.0.0.1:55323>

La carpeta local del equipo todavía se llama `Evetev-Habitat`, pero ese nombre
no es el nombre del producto ni debe volver a aparecer como una aplicación del
monorepo. El nombre vigente es **EveConecta** y la ruta vigente es
`apps/eveconecta`. La antigua `apps/eve-habitat` fue eliminada para evitar
confusiones.

## 2. Límite de responsabilidad

El equipo de este proyecto trabaja **únicamente en EveConecta**. Las demás
verticales pertenecen a otros equipos.

Áreas permitidas para cambios de esta vertical:

- `apps/eveconecta/**`: aplicación, API interna, pruebas, scripts y migraciones.
- `specs/eve-conecta/**`: especificaciones funcionales de EveConecta.
- Documentación específica de EveConecta dentro de `docs/**`, cuando sea
  necesario.
- `packages/brand/**` solo cuando el cambio sea realmente transversal y esté
  coordinado con el equipo de marca. EveConecta debe consumir la marca común, no
  duplicarla.

No modificar `apps/api`, otras aplicaciones, otros schemas o infraestructura de
otras verticales para resolver una necesidad local de EveConecta.

## 3. Fuentes de verdad y orden de lectura

Antes de cambiar código, leer en este orden:

1. Este documento.
2. [`ESTANDARES_INGENIERIA.md`](./ESTANDARES_INGENIERIA.md): constitución común
   del equipo. Aplica a todas las aplicaciones.
3. [`ESTANDARES_EVECONECTA.md`](./ESTANDARES_EVECONECTA.md): reglas específicas
   de la vertical. Es subordinado al estándar general.
4. [`INFRAESTRUCTURA_Y_CUENTAS.md`](./INFRAESTRUCTURA_Y_CUENTAS.md): servicios,
   propietarios y separación de cuentas.
5. [`DESPLIEGUE.md`](./DESPLIEGUE.md): Vercel, dominio y pipeline.
6. [`../apps/eveconecta/README.md`](../apps/eveconecta/README.md): operación de la
   aplicación y Supabase.
7. [`../specs/eve-conecta/README.md`](../specs/eve-conecta/README.md) y la spec
   particular de la funcionalidad que se vaya a tocar.

### Advertencia sobre documentación histórica

`ESTANDARES_EVECONECTA.md` conserva la definición original de un MVP centrado en
recaudo. Desde entonces el prototipo comercial creció e incluye comunidad,
comunicaciones, PQRS, reservas, portería, mantenimiento, asambleas y documentos.
No se debe borrar la regla arquitectónica del estándar, pero tampoco asumir que
su tabla histórica de “fuera del MVP” describe el código actual.

## 4. Estado de Git al entregar este relevo

Estado verificado al crear este documento:

- Rama local: `conecta`
- Rama remota: `origin/conecta`
- Último commit funcional de la sesión anterior:
  `8365745` — `feat(eveconecta): completar flujos operativos del demo`
- `origin/main` al 30 de agosto de 2026: `eb4e262`
- Divergencia observada: `conecta` tiene **1 commit propio** y está **39 commits
  detrás de `origin/main`**.

Antes de empezar otro bloque de desarrollo:

```bash
git fetch origin --prune
git switch conecta
git status
git log --oneline --decorate -5
```

Después se debe incorporar `origin/main` en `conecta` con el procedimiento del
equipo, revisar conflictos y repetir toda la validación. No sobrescribir trabajo
ajeno. No hacer merge de `conecta` a `main` ni desplegar producción sin la
aprobación explícita del responsable.

Flujo acordado:

1. Desarrollar y probar en `conecta`.
2. Publicar los cambios en `origin/conecta`.
3. Revisar localmente y, cuando aplique, en preview.
4. Solo al cerrar el bloque y con autorización, integrar a `main`.

Este flujo con una rama `conecta` de larga vida es una **excepción consciente** a la
regla trunk-based de `ESTANDARES_INGENIERIA.md` (§3, ramas cortas), aceptada por el
responsable del proyecto para poder agrupar bloques de demo. Mitigación: sincronizar
`origin/main` hacia `conecta` al inicio de cada bloque y no dejar que la divergencia
crezca más de un bloque de trabajo.

## 5. Arquitectura actual

### Stack

- Node.js 22 y pnpm workspace.
- Next.js 16 con App Router, React 19 y TypeScript.
- Supabase Auth, Postgres, Storage y RLS.
- `@supabase/ssr` para sesiones en cookies.
- Drizzle ORM y `postgres` para operaciones exclusivas del servidor.
- Zod para contratos y validaciones.
- Tailwind CSS 4 y componentes propios con Radix UI/Lucide.
- Vitest, Playwright y pgTAP para pruebas.
- Vercel para el frontend productivo.

### Flujo de una solicitud

```text
Página/Componentes
        │
        ▼
DataProvider (sesión, caché por usuario, toasts y acciones)
        │
        ▼
/api/v1/habitat/* (Route Handler de Next.js)
        │
        ├── Supabase Auth + membresía activa
        ├── RLS del schema conjuntos
        ├── RPC/tablas relacionales
        └── escenario comercial JSON, donde aún aplica
```

Archivos clave:

- [`components/data-provider.tsx`](../apps/eveconecta/components/data-provider.tsx):
  estado cliente, caché y acciones.
- [`app/api/v1/habitat/[[...segments]]/route.ts`](../apps/eveconecta/app/api/v1/habitat/[[...segments]]/route.ts):
  API interna.
- [`lib/contracts.ts`](../apps/eveconecta/lib/contracts.ts): contratos Zod y tipos.
- [`lib/demo/store.ts`](../apps/eveconecta/lib/demo/store.ts): acceso al escenario
  comercial y mutaciones actuales.
- [`lib/auth/access.ts`](../apps/eveconecta/lib/auth/access.ts): usuario,
  membresías y conjunto activo.
- [`lib/auth/permissions.ts`](../apps/eveconecta/lib/auth/permissions.ts): matriz
  de rutas y permisos.
- [`proxy.ts`](../apps/eveconecta/proxy.ts): refresco de sesión y protección de
  rutas.
- [`components/portal-pages.tsx`](../apps/eveconecta/components/portal-pages.tsx):
  pantallas principales del portal.

### Frontera con EvePay

Esta es una regla dura:

- EveConecta nunca importa módulos internos de `apps/api`.
- EveConecta nunca lee ni escribe el schema `evepay`.
- EveConecta es dueña únicamente del schema `conjuntos`.
- Los pagos reales se solicitan a EvePay por HTTP.
- `evepay_cobro_id` es una referencia externa sin llave foránea.
- El botón de pago actual ejecuta un flujo de demostración y solo puede aparecer
  para el rol `residente`.

## 6. Autenticación, tenants y permisos

Supabase Auth valida correo y contraseña. La autorización real se resuelve con
la membresía activa en `conjuntos.miembros_conjunto` y se vuelve a comprobar con
RLS.

Roles vigentes:

- `super_admin`
- `admin_conjunto`
- `consejo`
- `residente`

El conjunto es el tenant. Un usuario puede pertenecer a varios conjuntos; el
conjunto activo se guarda en una cookie y el servidor verifica que exista una
membresía válida. Nunca confiar en un rol o `conjunto_id` enviado libremente por
el navegador.

Resumen de navegación:

| Sección        | Superadmin | Administración | Consejo | Residente |
| -------------- | :--------: | :------------: | :-----: | :-------: |
| Inicio         |     Sí     |       Sí       |   Sí    |    Sí     |
| Finanzas       |     Sí     |       Sí       |   No    |    Sí     |
| Presupuesto    |     Sí     |       Sí       |   Sí    |    No     |
| Comunidad      |     Sí     |       Sí       |   No    |    Sí     |
| Comunicaciones |     Sí     |       Sí       |   Sí    |    Sí     |
| PQRS           |     Sí     |       Sí       |   Sí    |    Sí     |
| Reservas       |     Sí     |       Sí       |   Sí    |    Sí     |
| Portería       |     Sí     |       Sí       |   No    |    Sí     |
| Mantenimiento  |     Sí     |       Sí       |   Sí    |    No     |
| Asambleas      |     Sí     |       Sí       |   Sí    |    Sí     |
| Documentos     |     Sí     |       Sí       |   Sí    |    Sí     |
| Auditoría      |     Sí     |       Sí       |   No    |    No     |

Reglas funcionales ya decididas:

- Solo residentes inician pagos.
- El residente ve únicamente información de sus unidades.
- El registro de mascotas y vehículos permanentes corresponde al residente.
- La administración gestiona inventario de parqueaderos, operación general,
  gastos, comunicados, asambleas y soportes.
- Los datos de contacto del padrón de convocatoria son visibles para la
  administración, no para asistentes sin ese permiso.

## 7. Supabase y persistencia

### Ambientes

| Ambiente   | Destino                                     | Regla                                   |
| ---------- | ------------------------------------------- | --------------------------------------- |
| Local      | Supabase CLI/Docker, puertos `5532x`        | Datos ficticios y pruebas               |
| Preview    | Proyecto/branch independiente cuando exista | Nunca escribir en producción            |
| Producción | Proyecto `Eveconecta`                       | Solo despliegues aprobados desde `main` |

Configuración local:

- API: `127.0.0.1:55321`
- Postgres: `127.0.0.1:55322`
- Studio: `127.0.0.1:55323`
- SMTP local: `127.0.0.1:55324`

Las migraciones en
[`supabase/migrations`](../apps/eveconecta/supabase/migrations) son la fuente de
verdad. No crear tablas manualmente desde Supabase Studio ni modificar
producción sin migración.

Modelo base y extensiones implementadas:

- Conjuntos, membresías, unidades, personas y relación persona–unidad.
- Generaciones de cuotas, cuotas, movimientos de cuenta y auditoría.
- Escenario comercial aislado por rol y copropiedad.
- Pago residente de demostración.
- Tipo y número de identificación de personas.
- Parqueaderos mixtos, vehículos, asignaciones y eventos de acceso.
- Mascotas, estado, foto de perfil y RPC de mantenimiento del escenario.
- Comunicados.
- PQRS con evidencias de imagen.
- Asambleas, configuración, expediente, soportes y acceso a soportes.
- Autorizaciones de visitantes y reservas hechas por residentes.

Buckets privados:

| Bucket                         | Uso                              | Restricciones de aplicación           |
| ------------------------------ | -------------------------------- | ------------------------------------- |
| `eveconecta-case-images`       | Evidencias de PQRS               | Máximo 3; JPG/PNG/WebP; 5 MB cada una |
| `eveconecta-pet-photos`        | Foto de perfil de mascota        | JPG/PNG/WebP; 5 MB                    |
| `eveconecta-assembly-supports` | Soportes de asamblea versionados | PDF/DOCX/XLSX/JPG/PNG; 15 MB          |

Toda tabla o bucket nuevo debe incluir políticas RLS y pruebas de aislamiento.

## 8. Escenario comercial de demostración

El seed idempotente está en
[`scripts/seed-commercial-demo.mjs`](../apps/eveconecta/scripts/seed-commercial-demo.mjs).
Genera:

- 3 copropiedades.
- 4 residentes por copropiedad.
- Actividad en todos los módulos visibles.
- 1 cuenta residente por copropiedad.
- 1 cuenta comercial con acceso a los tres conjuntos y selector de tenant.

Copropiedades demo:

1. Conjunto Senderos del Parque.
2. Unidad Mirador de los Alpes.
3. Conjunto Bahía Verde.

Correos demo conocidos, sin documentar contraseñas:

- `demo.comercial@evetev.com`
- `demo.residente.senderos@evetev.com`
- `demo.residente.mirador@evetev.com`
- `demo.residente.bahia@evetev.com`

Las contraseñas se inyectan al ejecutar el seed; no deben escribirse en este
archivo, commits, incidencias o chats. El seed puede restaurar el escenario base
y reemplazar cambios hechos durante una demostración. Confirmar el ambiente
antes de ejecutarlo.

## 9. Funcionalidad implementada

### Inicio

- Resumen de la copropiedad y navegación por rol.
- Selector de copropiedad para usuarios con múltiples membresías.
- Vista residente reducida para no exponer indicadores colectivos.

### Finanzas

- Cartera, pagos y conciliación del escenario comercial.
- Pago de demostración disponible únicamente para residentes.
- La integración de pago real debe pasar por EvePay y aún no debe considerarse
  finalizada.

### Presupuesto y gastos

- Ejecución por rubro.
- Registro de solicitudes de gasto.
- Campo `NIT/Identificación` del proveedor.
- Flujo de aprobaciones y estados de demostración.

### Comunidad

- Listado y menú funcional de personas/ocupaciones.
- Edición de datos, tipo y número de identificación.
- Registro e inactivación de mascotas por residente.
- Foto de perfil privada de mascota.
- Registro de vehículos por residente.
- Inventario mixto de parqueaderos:
  - códigos por zona como `L1-5`, `M2-3` o `A1`;
  - parqueaderos asociados a casas como `C18-1` y `C18-2`;
  - ambos sistemas pueden convivir en la misma copropiedad.

### Comunicaciones

- Modal funcional para crear, programar o guardar comunicados.
- Audiencias: todos, propietarios y residentes con mascotas.
- Canales modelados: app, email y WhatsApp.
- Las tasas y estados visibles son en parte demostrativos; no equivalen a una
  entrega externa real.

### PQRS e incidencias

- Creación de casos con SLA por prioridad.
- Hasta tres imágenes por caso, con vista previa, validación y reversión ante
  fallos.

### Reservas

- Reserva de zonas comunes con comprobación de disponibilidad.
- La reserva residente se deriva de la sesión y de su unidad.
- Existe RPC con control de rol para el flujo de demostración.

### Portería

- Autorización de visitantes por residente.
- Registro de vehículos permanentes y validación de acceso.
- Eventos de ingreso/salida con decisión, origen e historial.
- Cola/cache local orientada a operación con conectividad limitada.

### Mantenimiento

- Creación y visualización de órdenes de trabajo del escenario comercial.

### Asambleas

- Programación de asambleas ordinarias, extraordinarias e informativas.
- Modalidades presencial, virtual e híbrida.
- Primera y segunda convocatoria, uso residencial o mixto.
- Expediente en seis etapas:
  1. Preparación.
  2. Convocatoria.
  3. Asistencia y poderes.
  4. Asamblea en vivo.
  5. Acta y cierre.
  6. Cumplimiento/seguimiento.
- Trece capacidades disponibles por defecto, configurables por copropiedad:
  repositorio documental, trazabilidad de convocatoria, poderes, acreditación,
  quórum continuo, votos por unidad o coeficiente, mayorías calificadas,
  votaciones secretas, participación híbrida, preguntas, acta y seguimiento de
  decisiones.
- Todas las capacidades nacen activas. La administración puede inactivar las que
  el reglamento particular no requiera.
- Lista de control, orden del día, mayorías y expediente.
- Carga, versionado, publicación, descarga e inactivación de soportes.
- Padrón con nombre, unidad, email y teléfono.
- Selección de destinatarios y registro individual de una convocatoria por email.

### Documentos

- Biblioteca demo con cinco PDF descargables desde
  `public/demo/documentos`.
- Generador reproducible en `scripts/generate-demo-documents.py`.
- Audiencias, versiones y estados visibles.

### Auditoría y PWA

- Eventos de auditoría visibles a administración.
- Service worker y caché de snapshot separados por usuario.
- Nunca incluir PII o secretos en logs, cachés compartidas o eventos técnicos.

## 10. Lo que todavía NO está terminado

Estos puntos deben mostrarse honestamente en demos y planificación:

1. **Sincronización con `main`:** `conecta` está 39 commits detrás del `main`
   remoto en la fecha de este documento.
2. **WhatsApp:** no existe proveedor integrado. En asambleas el botón está
   deshabilitado y los registros usan `pending_integration`. La elección de
   proveedor sigue pendiente de decisión del equipo.
3. **Email transaccional:** la convocatoria de asambleas registra una cola y
   auditoría demostrativa, pero no envía mediante un proveedor externo.
4. **EvePay real:** `pay-demo` y varias métricas financieras siguen siendo de
   demostración. No confundirlos con checkout, webhooks y conciliación reales.
5. **Persistencia definitiva:** varias operaciones mutan el snapshot JSON de
   `escenarios_demo`. Antes de producción deben evolucionar hacia tablas/RPC
   normalizadas sin perder RLS, idempotencia ni auditoría.
6. **Carga general de documentos:** el botón “Subir documento” todavía tiene un
   `onClick` vacío. Los cinco PDF demo sí se descargan.
7. **Canales y métricas:** algunos porcentajes de entrega, indicadores y textos
   son estáticos para la demostración.
8. **Preview aislado:** no debe apuntar a Supabase productivo. Si aún no existe un
   proyecto o branch de preview independiente, bloquear escrituras en previews.
9. **Specs financieras obligatorias:** siguen pendientes las especificaciones
   formales de generación de cuotas, aplicación de pagos, intereses de mora, paz
   y salvo, visibilidad financiera e integración EvePay.
10. **Validación legal:** quórums, mayorías, poderes, tratamiento de datos,
    intereses y reglas de cada conjunto deben ser configurables y validados con
    el reglamento particular y asesoría jurídica. No codificar una regla única
    para todas las copropiedades.

## 11. Decisiones de producto que deben conservarse

- Todas las reglas/capacidades de asamblea están disponibles por defecto y se
  pueden inactivar por copropiedad.
- Los residentes registran sus propias mascotas y vehículos.
- Una mascota admite perro/gato, año de nacimiento, tamaño, nombre, estado y foto.
- Inactivar una mascota conserva su historia.
- Un vehículo registrado y autorizado puede ingresar sin autorización de visita;
  el permiso de acceso y la asignación de parqueadero son conceptos separados.
- Los parqueaderos admiten codificación por zona y por casa dentro de un mismo
  conjunto.
- PQRS admite máximo tres evidencias de imagen.
- El botón de pago solo aparece para residentes.
- La convocatoria de asamblea debe usar email y WhatsApp; WhatsApp queda visible
  como pendiente hasta seleccionar e integrar el proveedor.
- La administración necesita el padrón con correo y teléfono, búsqueda,
  selección, estado individual y evidencia de entrega.
- El producto debe aplicar la marca común de `packages/brand`.
- La experiencia debe ser mobile-first y accesible para adultos mayores.

## 12. Puesta en marcha local

Requisitos: Node 22, pnpm, Docker y Supabase CLI.

```bash
corepack enable
pnpm install
cd apps/eveconecta
cp .env.example .env.local
pnpm db:start
pnpm db:status
```

Copiar únicamente la clave publicable local informada por Supabase a
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`. Después:

```bash
pnpm db:reset
pnpm dev
```

Aplicación: <http://localhost:3002>

Para restaurar el demo se usan variables de entorno efímeras y:

```bash
pnpm demo:seed
```

Consultar el ejemplo completo en el README de la aplicación. Nunca reutilizar
credenciales personales ni apuntar accidentalmente el seed local a producción.

## 13. Variables de entorno

| Variable                               | Alcance                     | Propósito                             |
| -------------------------------------- | --------------------------- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Cliente/servidor            | URL Auth/Data API del ambiente        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente/servidor            | Clave pública protegida por RLS       |
| `DATABASE_URL`                         | Solo servidor               | Pool Postgres para Drizzle            |
| `NEXT_PUBLIC_API_URL`                  | Cliente/servidor            | API HTTP de EvePay                    |
| `SUPABASE_URL`                         | Scripts puntuales           | Proyecto objetivo del script          |
| `SUPABASE_SECRET_KEY`                  | Solo comando administrativo | Aprovisionamiento/seed; atraviesa RLS |
| `SUPABASE_INVITE_REDIRECT_URL`         | Scripts puntuales           | Retorno de invitación Auth            |

`SUPABASE_SECRET_KEY` no debe desplegarse como variable normal del runtime ni
usarse en Client Components.

## 14. Comandos de calidad

Desde la raíz del monorepo:

```bash
pnpm format:check
pnpm --filter @evetev/eveconecta lint
pnpm --filter @evetev/eveconecta typecheck
pnpm --filter @evetev/eveconecta test
pnpm --filter @evetev/eveconecta build
```

Con Supabase local activo:

```bash
pnpm --filter @evetev/eveconecta db:reset
pnpm --filter @evetev/eveconecta db:lint
pnpm --filter @evetev/eveconecta db:test
```

Notas importantes:

- `db:test` prueba RLS y puede limpiar o reemplazar datos locales; restaurar el
  seed comercial después si se necesita continuar la demo.
- Todo cambio de autorización requiere test de rol y aislamiento entre tenants.
- Todo cambio de migración debe pasar reset, lint y pgTAP desde una base limpia.
- Validar visualmente los flujos críticos en <http://localhost:3002>.

## 15. Seguridad y secretos

- Nunca pegar tokens de GitHub, Supabase, Vercel, Railway, proveedores de correo
  o WhatsApp en código, documentación, commits o conversaciones de IA.
- En sesiones anteriores se compartieron tokens por chat; deben considerarse
  expuestos y rotarse.
- No leer ni imprimir `.env.local` para “documentar” la configuración.
- No usar claves de servicio en el navegador.
- No ejecutar migraciones o seeds remotos sin comprobar antes proyecto y rama.
- No usar `service_role` en el runtime normal.
- Mantener RLS como última barrera, incluso si la UI oculta una acción.
- No incluir nombres, teléfonos, correos o documentos en logs técnicos.

## 16. Definition of Done para el siguiente bloque

Antes de entregar una mejora:

- [ ] El cambio está limitado a EveConecta y sus specs/documentación.
- [ ] Existe spec cuando toca dinero, permisos, privacidad o una regla compleja.
- [ ] Los contratos Zod, UI, API y base usan el mismo vocabulario.
- [ ] No hay dependencia directa con código o schema interno de EvePay.
- [ ] RLS y aislamiento entre conjuntos están probados.
- [ ] Permisos por rol están aplicados en servidor, no solo en UI.
- [ ] Estados de carga, error, vacío y éxito son claros.
- [ ] El flujo funciona en móvil, teclado y lector de pantalla cuando aplique.
- [ ] No se expusieron PII ni secretos.
- [ ] Lint, tipos, unit tests, formato y build están verdes.
- [ ] Si hay migración: reset, lint y pgTAP están verdes.
- [ ] El demo local fue restaurado después de pruebas destructivas.
- [ ] Se revisó el diff y se publicó en `origin/conecta`.
- [ ] No se hizo merge a `main` sin autorización.

## 17. Prompt sugerido para otra cuenta de IA

Se puede entregar este archivo y usar el siguiente mensaje inicial:

> Lee completamente `docs/CONTEXTO_RELEVO_EVECONECTA.md` y las fuentes de verdad
> que allí se enlazan. Trabajaremos únicamente en `apps/eveconecta` y
> `specs/eve-conecta`; las demás verticales pertenecen a otros equipos. Antes de
> modificar código, revisa la rama `conecta`, incorpora de forma segura el último
> `origin/main` y confirma el estado real de la funcionalidad afectada. Implementa
> la solicitud con contratos, permisos de servidor, RLS, pruebas y validación
> visual proporcional al riesgo. Publica los cambios en `conecta`; no hagas merge
> a `main`, no despliegues producción y no uses secretos sin autorización
> explícita.

## 18. Primeras acciones recomendadas al retomar

1. Sincronizar `origin/main` hacia `conecta` y resolver cualquier conflicto.
2. Ejecutar la suite completa después de la sincronización.
3. Confirmar que el entorno local y el demo de tres copropiedades funcionan.
4. Elegir con el equipo el proveedor y la arquitectura multi-tenant de WhatsApp.
5. Implementar envío externo de email con idempotencia, evidencia y reintentos.
6. Migrar gradualmente las mutaciones del snapshot demo a persistencia
   normalizada.
7. Implementar la carga general de documentos.
8. Escribir las specs financieras obligatorias antes de habilitar dinero real.
