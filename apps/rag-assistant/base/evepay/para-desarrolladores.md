---
id: evepay-desarrolladores
titulo: EvePay para desarrolladores
producto: evepay
audiencia: desarrollador
vigencia: 2027-06-30
fuente: sitio-web
confianza: alta
---

## La integración

API REST sobre HTTP, con validación de esquema en cada frontera y tipos
compartidos entre la plataforma y quien la consume.

Crear un cobro es un `POST /pagos` con una `Idempotency-Key`. Si se reintenta con
la misma clave, la respuesta es el cobro que ya existía en vez de un cobro nuevo.

## El estado lo mueve la realidad

No hay `polling` frágil: los webhooks del proveedor llegan **firmados**, se
verifican y se normalizan a los eventos propios de EvePay.

La máquina de estados es explícita —`creado → pendiente → aprobado | fallido →
conciliado`— y toda transición queda auditada, sin edición ni borrado.

## Documentación

La documentación de la API está enlazada desde el pie de página de `evetev.com`.
