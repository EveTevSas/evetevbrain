---
id: evepay-capacidades
titulo: Qué resuelve la ingeniería de EvePay
producto: evepay
audiencia: comercio
vigencia: 2027-06-30
fuente: sitio-web
confianza: alta
---

## Un cobro que no se cobra dos veces

Cada cobro lleva una clave de idempotencia y una máquina de estados explícita.
Reintentar nunca cobra dos veces: el reintento devuelve el cobro que ya existía.

## La plata cuadra o se nota

El libro de movimientos es **inmutable y en doble partida**: la verdad contable de
cada peso que entra y sale, sin edición ni borrado.

La **conciliación** cruza lo cobrado contra lo que efectivamente se liquidó y
reporta cada diferencia. Así, un «yo sí pagué» se resuelve mirando datos y no
discutiendo.

## Trazabilidad

Cada cobro queda con su historial completo de estados, y toda transición queda
auditada.
