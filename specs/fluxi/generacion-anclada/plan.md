# Plan — Generación anclada

## Piezas

```
src/
├── generar/
│   ├── motor.ts        # la interfaz: PeticionModelo → RespuestaModelo
│   ├── moonshot.ts     # cliente de Kimi, sin SDK, con streaming
│   └── plantilla.ts    # prompt de sistema + armado del mensaje
├── guardas/salida.ts   # citas · cifras · enlaces
├── cargar.ts           # índice, selladas, límites y prompt desde disco
└── atender.ts          # el turno completo
```

## Por qué el anclaje vive en código y no en el prompt

Es una lección propia, de `apps/eve-studio`. Su regla 13 decía «termina siempre
indicando la URL del PR que te devolvió la herramienta». Sin haber llamado a la
herramienta, la única forma de cumplirla era inventarse la URL: **la regla que
debía dar trazabilidad fue la que fabricó el número.**

De ahí la regla dura de Fluxi: ninguna instrucción del prompt se da por cumplida
porque el modelo diga que la cumplió. Se le pide que cite, y `guardas/salida.ts`
comprueba que la cita exista.

## Y el corolario, que costó tres descartes

La misma idea al revés también hace daño. El prompt manda ofrecer
`contacto@evetev.com`; el modelo obedecía; ese correo no estaba en los seis
fragmentos entregados; la guarda lo marcaba como enlace inventado y **tiraba una
respuesta correcta**. Pasó tres veces en la primera comparación de modelos.

El conjunto válido no es «lo que está en el contexto», es **«lo que escribimos
nosotros»**: contexto ∪ prompt de sistema. Los enlaces autorizados se extraen del
propio `_sistema.md`, así que si mañana el prompt ofrece otro canal, la guarda se
entera sola.

## Lo que se aprendió llamando al modelo de verdad

| Hallazgo                                                                        | Consecuencia                                                                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kimi-k2.6` responde 400 si `temperature` ≠ 1                                   | El parámetro es opcional y no se envía si no está definido                                                                                                    |
| Los modelos razonan antes de responder, y ese razonamiento consume `max_tokens` | Primera llamada real: **texto vacío** con los 220 tokens gastados. Se apaga: `thinking: disabled`, y `reasoning_effort: low` en `kimi-k3`, que siempre razona |
| El caché de contexto sí acierta                                                 | 1.331 de 1.495 tokens de entrada cacheados con `prompt_cache_key` estable                                                                                     |

**El anclaje no dependía de la temperatura.** Que un modelo no la admita no
cambió nada, y eso es la prueba de que las guardas están en el sitio correcto:
la compuerta decide si se llama, y la verificación decide si se muestra.

## La elección de modelo, medida

Seis preguntas, las mismas para los dos, con la verificación activa:

| Modelo      | Generadas | Descartadas | Latencia media | Entrada (cacheada) | Salida  |
| ----------- | --------- | ----------- | -------------- | ------------------ | ------- |
| `kimi-k3`   | 5         | 0           | 4.963 ms       | 1.495 (1.331)      | 138     |
| `kimi-k2.6` | 5         | 0           | **3.461 ms**   | 1.409 (1.277)      | **110** |

Calidad equivalente: los dos responden anclados, citan bien y ninguno inventó.
`kimi-k2.6` es **un 30% más rápido** y gasta menos salida, y `kimi-k3` cuesta
US$3,00/M de entrada y US$15,00/M de salida. **Se elige `kimi-k2.6`.** La tarifa
de k2.6 no está publicada en la documentación; se confirma en la consola.

## Restricciones

- Tope de 220 tokens de salida, temperatura sin enviar, razonamiento apagado.
- `prompt_cache_key` estable: el sistema es idéntico entre peticiones y la
  entrada cacheada cuesta un orden de magnitud menos.
- La verificación **descarta entera** la respuesta; no la parchea.
