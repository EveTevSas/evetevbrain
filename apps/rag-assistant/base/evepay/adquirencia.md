---
id: evepay-adquirencia
titulo: Quién procesa los pagos
producto: evepay
audiencia: comercio
vigencia: 2026-11-30
fuente: decision-john-2026-08-19
confianza: alta
---

## EvePay se apoya en un backbone de adquirencia

EvePay no es la entidad que tiene la licencia de adquirencia. Se apoya en **un
único backbone de adquirencia**, que es quien aporta la licencia, el
procesamiento, la liquidación y el control de riesgo. No hay agregadores
intermedios entre EvePay y ese backbone.

El nombre del proveedor no se publica en las páginas de producto, así que tampoco
se menciona aquí. Quien necesite ese detalle para evaluar una integración lo pide
al equipo y se lo explican.

## Por qué está montado así

El comercio habla con EvePay y EvePay habla con el backbone. Esa separación es
deliberada: permite cambiar de proveedor sin que el comercio tenga que rehacer su
integración, porque lo que consume es la interfaz de EvePay y no la del
procesador.

## La habilitación toma semanas

La habilitación con la adquirencia **no es un trámite automático**: se gestiona
con el equipo del proveedor y toma semanas. Corre en paralelo al desarrollo, y es
la razón por la que el núcleo de pagos ya está construido y EvePay todavía no se
puede usar en producción.

## Los datos de tarjeta

La tokenización y el checkout embebido son los del backbone de adquirencia. Por
eso ni EvePay ni el comercio guardan el número de la tarjeta en ningún momento.
