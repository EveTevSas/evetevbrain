# Estándares de ingeniería — EveConecta

*Estándares de la vertical **EveConecta** (`apps/eveconecta`): gestión y recaudo para conjuntos residenciales en propiedad horizontal. Es la primera vertical de **EvePay**, la plataforma de pagos de **Evetev SAS**.*

> **Este documento es subordinado.** La constitución del equipo es [`ESTANDARES_INGENIERIA.md`](./ESTANDARES_INGENIERIA.md) y aplica **completa** a EveConecta: stack (§2), código y Git (§3), seguridad (§4), accesibilidad (§5), Definition of Done (§6), repositorio (§8), SDD (§9) y despliegue (§10).
>
> Aquí solo va **lo que es específico de esta vertical**. Si algo ya está en la constitución, no se repite: se cita. Ante conflicto, manda la constitución.

---

## 1. Qué es EveConecta y qué NO es

**EveConecta tiene dos trabajos, y el segundo es el importante:**

1. Resolverle la vida al administrador de un conjunto residencial: cobrar la administración sin perseguir a nadie a mano.
2. **Ser la prueba viviente de que EvePay funciona** — cobrando dinero real, a clientes reales, con nosotros como primer comercio (dogfooding).

Si alguna vez esos dos trabajos entran en conflicto, gana el segundo. EveConecta existe para validar la plataforma; una feature que le sirve al conjunto pero ensucia EvePay **no se hace así**.

**Lo que EveConecta NO es:**

- **No es un ERP contable de propiedad horizontal.** No reemplazamos al contador ni al software contable del conjunto. Nos concentramos en el ciclo de cobro y recaudo.
- **No es una red social del conjunto.** Reservas de salón, chat de vecinos, minutas de vigilancia: fuera del MVP. Se evalúan cuando el recaudo esté validado.
- **No es dueña de la lógica de pagos.** Todo lo que sea cobrar, conciliar o llevar el ledger es de EvePay. EveConecta **pide** cobros, no los procesa.

### Alcance del MVP

| Dentro | Fuera (por ahora) |
|---|---|
| Cargar y generar cuotas de administración | Contabilidad y estados financieros del conjunto |
| Estado de cuenta por unidad | Reservas de zonas comunes |
| Pago en línea del residente (vía EvePay) | Chat / cartelera / PQRS |
| Recordatorios automáticos de cobranza | Asambleas y votaciones digitales |
| Panel de morosidad para el administrador | Gestión de proveedores y gastos |
| Cuotas extraordinarias y multas | Nómina de empleados del conjunto |
| Certificado de paz y salvo | App móvil nativa (usamos web mobile-first) |

---

## 2. La frontera con EvePay (regla dura)

Esto es lo que hace vendible a EvePay. **No es negociable y no se "optimiza" por conveniencia.**

- **EveConecta NO importa módulos de EvePay.** Aunque vivan en el mismo monorepo, la comunicación es **por HTTP** (vía `evepay-sdk` cuando exista). Importar `apps/api/src/modules/pagos` directamente destruye el dogfooding: si nuestra vertical no consume la plataforma como un cliente externo, nunca sabremos si sirve para clientes externos.
- **EveConecta NO lee ni escribe el schema `evepay`.** Su dominio vive en el schema `conjuntos`. Para saber si un cobro se aprobó, se le pregunta a la API o se escucha su evento.
- **Sin llaves foráneas entre schemas.** `cuota.evepay_cobro_id` es un `uuid` sin FK. Los contextos se enlazan por ID.
- **EvePay no sabe qué es una cuota.** Cuando EveConecta pide un cobro, manda un monto, una referencia externa y una descripción. El concepto "cuota de administración de marzo, torre 3 apto 502" es **texto** para EvePay.

### El contrato, en concreto

```
EveConecta                                  EvePay
    │
    ├── POST /cobros ───────────────────────►  crea cobro (idempotencyKey)
    │     { monto, referencia_externa: cuota_id,
    │       descripcion, comercio_id }
    │
    │   ◄─────────────────────────────────────  { cobro_id, estado, url_checkout }
    │
    ├── guarda cuota.evepay_cobro_id
    │
    │   ◄──── webhook / evento: cobro.aprobado ─
    │
    └── marca la cuota como pagada (en SU schema)
```

**Quién es el tenant:** el **conjunto** es un tenant de EveConecta. En EvePay, el tenant es el **comercio** — y hoy ese comercio somos nosotros (Evetev), o el conjunto si se le da su propia cuenta de comercio. Son dos conceptos distintos con nombres parecidos: **no los mezclen en el código**. `conjunto_id` ≠ `comercio_id`.

**Regla de decisión:** ante cualquier duda sobre dónde va algo, aplica el test de la constitución (§8): *¿le entregaría esto tal cual a un ecommerce que compre EvePay?* Si menciona "cuota", "torre", "coeficiente" o "administrador" → es de EveConecta.

---

## 3. Modelo de dominio (lenguaje ubicuo)

Usamos **el vocabulario legal y cotidiano de la propiedad horizontal en Colombia**, no inventamos términos. Estos nombres se usan igual en el código, en la base de datos, en la UI y en las specs.

| Término | Qué es | Ojo con |
|---|---|---|
| **Conjunto** | La copropiedad. Es el tenant. | Puede tener varias torres/etapas. |
| **Unidad** | Apartamento, casa, local o parqueadero con matrícula propia. | La deuda es **de la unidad**, no de la persona. |
| **Coeficiente de copropiedad** | Porcentaje de participación de cada unidad. Base del reparto de gastos. | Definido en el reglamento de PH. La suma debe dar 100%. |
| **Propietario** | Dueño de la unidad. **Es el obligado a pagar.** | Puede no vivir ahí. |
| **Residente** | Quien habita la unidad (propietario o arrendatario). | Un arrendatario **no** es el deudor de la cuota de administración. |
| **Administrador** | Representante legal de la copropiedad. Nuestro usuario principal. | Es quien firma y quien nos paga. |
| **Consejo de administración** | Órgano de control. | Solo lectura en el MVP. |
| **Cuota de administración** | Cobro ordinario periódico (normalmente mensual). | Se calcula por coeficiente sobre el presupuesto. |
| **Cuota extraordinaria** | Cobro aprobado por asamblea para un gasto puntual. | Requiere respaldo del acta. |
| **Multa / sanción** | Cobro por incumplimiento del reglamento. | Tiene proceso propio; en el MVP solo se registra. |
| **Interés de mora** | Recargo por pago tardío. | **Tiene tope legal** — ver §4. |
| **Paz y salvo** | Certificación de que una unidad no debe nada. | Se pide al vender o traspasar. |
| **Estado de cuenta** | Saldo y movimientos de una unidad. | Es lo que el residente abre primero. |

**Nota legal:** la propiedad horizontal en Colombia se rige por la **Ley 675 de 2001** y por el reglamento de PH de cada conjunto. El reglamento **varía entre conjuntos** (periodicidad, sanciones, quórums), así que el sistema debe permitir configurar esas reglas por conjunto en vez de asumirlas. Los detalles legales se confirman con asesoría; este documento no es asesoría jurídica.

---

## 4. Reglas de negocio que NO se dejan a interpretación

Estas van **siempre con spec** (§9 de la constitución) porque un error aquí es plata mal cobrada y confianza perdida.

### Dinero

- **Los montos se guardan como enteros en centavos de COP.** Nunca `float`, nunca `number` suelto. Un redondeo silencioso en una cuota multiplicado por 200 unidades es una diferencia real en caja.
- **El redondeo se define una vez y se documenta.** Repartir un presupuesto por coeficientes casi nunca da exacto: hay que decidir explícitamente dónde cae el residuo (típicamente, ajustar la última unidad o la de mayor coeficiente) y probarlo con un test.
- **La suma de las cuotas generadas debe cuadrar exactamente con el presupuesto repartido.** Test obligatorio.

### Generación de cuotas

- La cuota ordinaria de una unidad = `presupuesto_del_periodo × coeficiente_de_la_unidad`, con la regla de redondeo definida arriba.
- **Idempotencia de la generación:** generar las cuotas de un mismo periodo dos veces **no** puede duplicar la deuda. La generación lleva su propia clave (`conjunto_id + periodo`).
- Una unidad puede tener coeficiente que cambie (reformas del reglamento): la cuota se calcula con el coeficiente **vigente al momento de generar**, y ese valor queda registrado en la cuota. Nunca se recalcula hacia atrás.

### Aplicación de pagos (el caso borde que más duele)

Cuando llega un pago parcial o un abono, **el orden de aplicación tiene que estar decidido, no improvisado**:

1. Se define un orden explícito (por ejemplo: intereses → cuotas más antiguas → cuota corriente).
2. Ese orden se documenta en la spec, se configura si el reglamento del conjunto lo exige distinto, y se prueba con tests.
3. **Cada aplicación de pago queda registrada** con qué se abonó a qué. Cuando un propietario reclame "yo sí pagué", el sistema debe poder mostrar el detalle.

Nunca se implementa una regla de aplicación de pagos "como salga". Es una decisión de negocio con efecto legal.

### Intereses de mora

- El interés moratorio en propiedad horizontal **tiene un tope legal** en Colombia y el conjunto no puede cobrar por encima. La tasa máxima **cambia periódicamente**, así que:
  - **No se hardcodea una tasa.** Es configuración, con vigencia por fecha.
  - El sistema **debe impedir** configurar una tasa por encima del tope legal vigente.
  - El cálculo queda auditado: qué tasa se usó, sobre qué saldo, por cuántos días.
- Confirmar con asesoría legal el tope aplicable y su fuente de actualización antes de habilitar el cobro de intereses en producción.

### Estado de cuenta

- **Debe ser reconstruible desde los movimientos**, no un campo `saldo` que alguien actualiza. En PH las disputas de "yo pagué y no me aparece" son constantes: la verdad tiene que ser el historial, no un número suelto.
- Todo movimiento (cuota generada, interés causado, pago aplicado, ajuste manual) queda con timestamp, actor y motivo. **Los ajustes manuales del administrador se auditan igual que todo lo demás.**

---

## 5. Roles y permisos

Sobre el RBAC de la constitución (§4), esta vertical concreta así:

| Rol | Puede | No puede |
|---|---|---|
| `super_admin` (Evetev) | Soporte y operación multi-conjunto | Ver PII sin registro de acceso |
| `admin_conjunto` | Generar cuotas, ver morosidad, emitir paz y salvo, hacer ajustes (auditados) | Ver datos de otro conjunto |
| `consejo` | Lectura de reportes agregados | Ver el detalle de deuda por unidad identificada, salvo que el reglamento lo permita |
| `residente` | Ver **su** estado de cuenta y pagar | Ver el estado de cuenta de otra unidad |

**Reglas duras:**

- **Un residente jamás ve la deuda de otra unidad.** Test obligatorio, igual que el de aislamiento entre tenants (§3 de la constitución).
- **La morosidad ajena es dato sensible.** Publicar listas de morosos con nombre y apartamento es una práctica común en conjuntos y es **jurídicamente riesgosa** (afecta el buen nombre y el habeas data). El producto **no** genera ese tipo de listados públicos; los reportes de morosidad son para el administrador, no para la cartelera.
- Un propietario puede tener varias unidades; un residente puede estar asociado a una unidad sin ser el deudor. El permiso se resuelve por **relación persona–unidad**, no por "es residente".

---

## 6. Datos personales (esta vertical es la que más PII toca)

EveConecta maneja datos de personas naturales que **no son nuestros clientes directos** (los residentes). Sobre lo que ya dice la constitución (§4, Ley 1581):

- **Minimización real.** Para cobrar una cuota necesitamos: unidad, nombre y un canal de contacto. **No pedimos** cédula, fecha de nacimiento, datos del vehículo, composición familiar ni fotos, salvo que una feature concreta lo exija y esté justificada.
- **El conjunto es responsable, nosotros somos encargados.** El conjunto recolecta los datos de sus residentes; nosotros los tratamos por cuenta suya. Eso implica un **contrato de tratamiento de datos** con cada conjunto. Confirmar redacción con asesoría legal antes del primer cliente.
- **Autorización de tratamiento** registrada: quién autorizó, cuándo y para qué. Se guarda con el residente.
- **Derechos ARCO operables:** el sistema debe poder **exportar** y **eliminar** los datos de una persona sin borrar el historial contable de la unidad (la deuda es de la unidad). Diseñar el borrado como **anonimización de la persona**, conservando los movimientos.
- **Nunca PII en logs** (§4). Aquí es especialmente fácil equivocarse con nombres y teléfonos en los logs de notificaciones: se registra el `residente_id`, no el número.

---

## 7. Notificaciones y cobranza (el corazón del producto)

El recordatorio automático es probablemente **la razón por la que un administrador nos paga**. También es lo más fácil de convertir en acoso. Reglas:

- **Detrás de la interfaz `Notifier`** (§2 de la constitución). Nada de llamar al SDK de WhatsApp desde el dominio.
- **Tono de vecino, no de cobrador.** El destinatario es alguien que probablemente se le pasó la fecha, no un delincuente. Español claro, sin jerga legal amenazante, sin mayúsculas sostenidas.
- **Frecuencia con tope.** Se define un máximo de recordatorios por periodo y por persona, configurable por conjunto. **Un residente nunca recibe dos notificaciones del mismo hecho.**
- **Horario respetuoso.** No se envían recordatorios de madrugada. Se define una ventana horaria y se respeta la zona horaria de Colombia.
- **Nunca se notifica una deuda a un tercero.** Ni al arrendatario si el deudor es el propietario, ni al vecino, ni a un grupo. La cobranza es individual.
- **Idempotencia también aquí:** un reintento del workflow (Inngest) no puede mandar el mismo WhatsApp dos veces.
- **Todo envío queda registrado** (a quién, cuándo, por qué canal, con qué resultado). Sirve de evidencia ante reclamos y alimenta los eventos del producto.

---

## 8. Accesibilidad y lenguaje (aquí el estándar aprieta más)

Aplica todo el §5 de la constitución (WCAG 2.2 AA), con estos énfasis propios de esta vertical:

- **Los usuarios incluyen adultos mayores.** Muchos propietarios son personas mayores usando un celular. Texto legible sin zoom, botones grandes, flujos cortos, nada de gestos ocultos.
- **El flujo de pago es el flujo crítico.** Un error ambiguo ahí cuesta plata y confianza. Mensajes de error específicos, ligados al campo, y siempre con una salida clara ("vuelve a intentar", "contacta al administrador").
- **Español claro, no jerga contable.** "Lo que debes" y no "saldo en cartera". "Cuota de administración de marzo" y no "concepto 001". La constitución ya lo dice; aquí es especialmente crítico porque el usuario no eligió usar el software: se lo impuso su conjunto.
- **Nunca comunicar el estado solo con color.** "En rojo = moroso" debe llevar texto o ícono. Además del tema de accesibilidad, un estado de deuda mal entendido genera reclamos.
- **Funciona con una mano, en la calle, con mala señal.** Mobile-first de verdad: el residente entra desde el celular, no desde un escritorio.

---

## 9. Qué lleva spec obligatoria en EveConecta

Sobre el gatillo de la constitución (§9), en esta vertical **siempre** llevan spec con criterios EARS:

1. Generación de cuotas (reparto por coeficiente, redondeo, idempotencia).
2. Aplicación de pagos parciales y abonos.
3. Cálculo de intereses de mora.
4. Emisión de paz y salvo.
5. Reglas de visibilidad entre roles (quién ve la deuda de quién).
6. Cualquier integración nueva con EvePay.
7. Reglas de frecuencia y horario de cobranza.

Ejemplo de criterio EARS de esta vertical:

> **CUANDO** se genera el cobro del periodo `P` para un conjunto que ya tiene cuotas generadas para `P`, **EL** sistema **DEBERÁ** rechazar la operación y devolver las cuotas existentes, sin crear cuotas nuevas ni modificar saldos.

Lo demás (pantallas presentacionales, ajustes de copy, reportes simples) va con prompt directo.

---

## 10. Definition of Done adicional

Además del checklist de la constitución (§6), un PR de EveConecta no está listo si no cumple:

**Frontera**
- [ ] No importa código de `apps/api` (EvePay); la comunicación es por HTTP/SDK.
- [ ] No consulta el schema `evepay`.
- [ ] No introdujo conceptos de conjuntos dentro de EvePay.

**Dominio**
- [ ] Los montos son enteros en centavos; ninguna operación usa `float`.
- [ ] Si toca cuotas, intereses o aplicación de pagos: hay spec con criterios EARS y tests derivados de ellos.
- [ ] Los movimientos quedan auditados (quién, cuándo, por qué).

**Privacidad**
- [ ] No expone datos de una unidad a quien no le corresponde (test incluido).
- [ ] No hay PII en logs ni en eventos de analítica.
- [ ] No genera listados públicos de morosos.

**Experiencia**
- [ ] El texto está en español claro, sin jerga contable.
- [ ] Probado en pantalla de celular, con una mano.
- [ ] Si notifica: idempotente, con tope de frecuencia y dentro de la ventana horaria.

---

## 11. Decisiones abiertas de la vertical

Se cierran igual que en la constitución (§7): se decide una vez, se anota aquí con una línea de porqué, y no se rediscute.

1. **Periodicidad y calendario de cobro:** ¿el sistema asume mes calendario o lo configura cada conjunto?
2. **Orden de aplicación de pagos:** definir el orden por defecto y si es configurable por conjunto.
3. **Intereses de mora en el MVP:** ¿se cobran desde el primer día o se lanza sin intereses para simplificar la validación?
4. **Quién es el comercio en EvePay:** ¿Evetev cobra por cuenta de los conjuntos, o cada conjunto se onboardea como comercio propio? Tiene implicaciones de flujo de dinero, contrato y KYC — **decidir antes de facturar al primer cliente**.
5. **Canal principal de notificación:** WhatsApp como default vs email, y qué pasa si el residente no tiene el canal.
