# RBAC operativo: quién puede hacer qué en la consola

> Fase 7 del [plan de EvePay](../../../docs/PLAN_DESARROLLO_EVEPAY.md). Extiende
> [`identidad-rbac`](../identidad-rbac/) y [`admin-console`](../admin-console/).
> Toca RBAC: spec obligatoria (§9).

## Problema

La consola tiene un solo rol, `super_admin`, que puede todo. Con la
dispersión, una sola persona podría preparar un pago, aprobarlo y registrarlo:
es justo el fraude interno que un agregador tiene que impedir. Y no todo el
equipo debe poder cambiar tarifas o tocar dinero.

## Roles internos

| Rol           | Para quién               | Qué puede                                                                                                                                               |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `super_admin` | Dirección de Evetev      | Todo, salvo aprobar un lote que preparó                                                                                                                 |
| `ops`         | Operación diaria         | Comercios (alta, perfil, KYC, claves, estado), reverificar pagos, registrar consignaciones, preparar lotes, liberar retención de primer cobro; lee todo |
| `finanzas`    | Tesorería / contabilidad | Aprobar lotes, registrar pago o fallo, registrar saldo del banco, liberar reservas, registrar consignaciones; lee todo                                  |

Solo `super_admin` cambia tarifas y políticas de dispersión. `admin_comercio`
sigue siendo el rol del comercio en la API pública y **no** entra a la consola.

## Requisitos funcionales

- El rol viaja en `app_metadata.role` del JWT de Supabase, escrito solo con la
  clave secreta (`auth:provision-admin --role ops|finanzas|super_admin`).
- La consola deja entrar a los tres roles internos; cada acción de escritura se
  muestra solo a quien puede hacerla, y la API la rechaza con 403 si llega igual.
- **Cuatro ojos**: `preparado_por ≠ aprobado_por` se valida en la base, con el
  actor (correo) de cada paso.
- Cada endpoint admin declara los roles permitidos; sin rol → 403; rol no
  permitido → 403 con un mensaje que dice qué rol hace falta.
- La auditoría sigue registrando el actor; el rol queda en el detalle de las
  acciones de dispersión.

## No-objetivos

- Gestión de usuarios desde la consola (se aprovisionan por script).
- Permisos por comercio para el staff (todos los internos son cross-tenant).
- Segregación en el alta de comercios (una persona puede crearlo y aprobarlo:
  el KYC manual ya es el control).

## Criterios de aceptación (EARS)

1. **CUANDO** un usuario con rol `ops` o `finanzas` entra a la consola, **EL** sistema **DEBERÁ** dejarlo pasar; con cualquier otro rol o sin rol, **DEBERÁ** enviarlo a «sin acceso».
2. **CUANDO** un rol llama a un endpoint admin que no le corresponde, **EL** sistema **DEBERÁ** responder 403 con el rol requerido en el mensaje, sin ejecutar nada.
3. **CUANDO** `ops` cambia una tarifa o `finanzas` prepara un lote, **EL** sistema **DEBERÁ** rechazarlo con 403.
4. **CUANDO** la misma persona intenta aprobar el lote que preparó, **EL** sistema **DEBERÁ** rechazarlo en la base aunque sea `super_admin`.
5. **CUANDO** se aprovisiona un usuario interno, **EL** sistema **DEBERÁ** exigir uno de los tres roles y escribirlo en `app_metadata`.
6. **CUANDO** se audita una acción de dispersión, **EL** sistema **DEBERÁ** guardar el rol del actor en el detalle.

## Restricciones de la constitución

- §4: cada endpoint declara su rol; el rol nunca sale de `user_metadata`.
- Auditoría inmutable de todas las acciones del staff.
