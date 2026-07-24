# @evetev/web-conjuntos

La **primera vertical**: dashboard de conjuntos residenciales. Es la cuña que valida
EvePay cobrando dinero real (§1). **No es el producto** — es la prueba viviente de
que el producto funciona (somos nuestro primer cliente).

## No es "solo un frontend"

Es una app completa: front (`app/`) **+ su propio backend de dominio**. El dominio de
conjuntos (`cuotas`, `unidades`, `residentes`) vive AQUÍ, nunca en el núcleo EvePay (§8).

```
app/
├── (rutas UI)
└── api/        # Route Handlers: las APIs de dominio de la vertical
server/         # casos de uso del dominio conjuntos + cliente HTTP a EvePay
```

## Frontera con EvePay (tres reglas duras, §8)

1. Sin llaves foráneas entre schemas (`conjuntos` guarda `evepay_cobro_id`, sin FK).
2. Sin imports cruzados: no lee tablas de `evepay`, pregunta por la API.
3. **Habla con EvePay solo por HTTP** (`server/evepay-client.ts`) — dogfooding.

## Correr

```bash
pnpm --filter @evetev/web-conjuntos dev   # http://localhost:3000
```
