# specs/eve-conecta/

Especificaciones de la vertical **Eve-Conecta** (conjuntos residenciales). Reglas de
dominio en [`docs/ESTANDARES_EVEHABITAD.md`](../../docs/ESTANDARES_EVEHABITAD.md).

Llevan spec obligatoria (§9 de la vertical) — aún **por escribir**:

- `generacion-cuotas` — reparto por coeficiente, redondeo, idempotencia.
- `aplicacion-pagos` — orden de aplicación de pagos parciales y abonos.
- `intereses-mora` — cálculo con tope legal configurable.
- `paz-y-salvo` — emisión del certificado.
- `visibilidad-roles` — quién ve la deuda de quién.
- `integracion-evepay` — cómo la vertical consume EvePay por HTTP.

> El dominio de la vertical vive con la vertical (§8): estas specs no van en `evepay/`.
