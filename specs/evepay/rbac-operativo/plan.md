# Plan — RBAC operativo

## Arquitectura

- `Role` en `apps/api/src/modules/identidad/roles.ts` suma `OPS` y `FINANZAS`;
  `ROLES_INTERNOS` = los tres. `permisos.ts` en el módulo admin: una tabla
  `Accion → Role[]` (una sola fuente), y `AdminController.exigir(accion)` que
  reemplaza a `verificarAdmin()` y lanza 403 con el rol requerido.
- `RequestContext.role` ya trae el rol del JWT; no cambia el middleware.
- Consola: `lib/auth/permissions.ts` pasa de `esSuperAdmin` a
  `rolInterno(user)` y `puede(rol, accion)` con la misma tabla (copiada al
  cliente, sin importar la API); el proxy deja entrar a los tres roles; los
  componentes reciben el rol y ocultan los botones que no aplican.
- `scripts/provision-admin.mjs` acepta `--role` (por defecto `super_admin`).

## Decisiones

- **Tabla de permisos en código, no en base.** Con tres roles fijos, una tabla
  en la base sería configuración que nadie va a cambiar sin un deploy de todos
  modos; en código queda versionada, testeada y visible.
- **El cuatro ojos vive en la base** (`check` y función), no solo en el
  servicio: es la única garantía que sobrevive a un bug del código.
