---
id: evepay-seguridad
titulo: Seguridad y datos de tarjeta
producto: evepay
audiencia: comercio
vigencia: 2027-06-30
fuente: sitio-web
confianza: alta
---

## Nunca se toca el número de tarjeta

Ni EvePay ni el comercio guardan el número de la tarjeta en ningún momento. El
dato sensible lo captura el **checkout embebido del proveedor de pagos**, así que
no entra a los sistemas de Evetev ni a los del comercio.

## Qué implica para el comercio

Como los datos de tarjeta no tocan sus sistemas, el alcance de la auditoría del
comercio se reduce a SAQ-A y no necesita certificaciones PCI propias. Es la
diferencia entre cumplir un cuestionario y montar un programa de cumplimiento.

## Aislamiento de datos

Los datos de cada cliente están aislados **a nivel de base de datos**, no
solamente por una condición en el código. Cada movimiento queda auditado: quién,
cuándo y por qué, sin edición ni borrado posterior.
