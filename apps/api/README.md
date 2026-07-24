# @evetev/api — EvePay

El **núcleo**: la plataforma de pagos que vendemos (§1, §8). NestJS, monolito modular.

**EvePay no conoce el dominio de ninguna vertical** — no sabe qué es una "cuota" ni
un "residente". Solo cobra. Las verticales lo consumen por HTTP como lo haría un
comercio externo (dogfooding).

## Módulos (arranque mínimo)

- `modules/pagos` — cobros idempotentes (frontera con `PaymentProvider`).
- `modules/ledger` — libro de movimientos inmutable (costura; lógica vía spec).

Los demás módulos del destino (`conciliacion`, `merchants`, `webhooks`,
`identidad`, `ia`) se agregan cuando la validación los pida (§8).

## Pagos detrás de una interfaz

Todo pasa por `PaymentProvider` (contrato en `@evetev/shared`). En local/CI se usa
`FakePaymentProvider`; Akua es la implementación real y se enchufa sin tocar el
núcleo (§4, §7).

## Correr

```bash
pnpm --filter @evetev/api dev     # nest start --watch
```

Endpoints: `GET /v1/health`, `POST /v1/pagos` (requiere header `Idempotency-Key`).
