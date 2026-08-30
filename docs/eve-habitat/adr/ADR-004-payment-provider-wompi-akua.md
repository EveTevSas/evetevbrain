# ADR-004: Contrato PaymentProvider

- Estado: Aceptada
- Fecha: 2026-07-18

## Contexto

Eve-Habitat debe cumplir los estándares de ingeniería EVETEV y operar con aislamiento, trazabilidad y bajo costo operacional.

## Decisión

El dominio depende de `PaymentProvider`. Mock es determinístico local, Wompi es el riel provisional y Akua el backbone objetivo. Checkout es hospedado y EVETEV no recibe PAN.

## Consecuencias

Cambiar proveedor no modifica pagos, ledger ni cartera. La certificación real depende de credenciales externas.
