# Plan — Endpoint y widget

## Una sola implementación, dos adaptadores

```
src/api/nucleo.ts     ← toda la logica: rutas, guardas, cupos, flujo
     ├── api/index.ts        adaptador de Vercel   (una funcion + rewrites)
     └── scripts/servir.ts   adaptador local       (node:http + public/)
```

Los adaptadores solo traducen. Lo que se prueba en el portátil es lo que corre en
producción, sin una segunda implementación que se desincronice.

## El problema que el plan no había visto

**Lo que ya se mostró no se puede desdecir.** Si se transmite token a token y la
verificación falla al final, la respuesta mala ya la vio la persona.

La salida es transmitir **por frases ya verificadas**: se acumula, se corta en
frases completas y cada una se comprueba antes de emitirse. El primer texto
visible aparece al cabo de una frase —no de la respuesta entera— y **nada sin
verificar llega nunca a la pantalla**.

El detalle que lo hace correcto: **las citas van después del punto**
—«…que ya existía. [#evepay-capacidades#1]»—, así que una frase no está cerrada
en el punto, sino después del grupo de citas que la sigue. `frases-seguras.ts` no
suelta una frase mientras pueda quedarle algo pegado.

## El índice viaja dentro del código

`src/indice/incluido.ts` lo importa como módulo, no lo lee del disco. Con
`readFileSync` habría que acertar con `includeFiles` y con rutas relativas que
cambian al empaquetar — un modo de fallo que solo aparece en producción, que es
donde peor se diagnostica. De paso, selladas, límites y prompt se compilan
**dentro** del índice: un artefacto y ninguna dependencia del sistema de
archivos.

## Lo que se aprendió montándolo

| Hallazgo                                                      | Consecuencia                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| El navegador **no manda `Origin` en un GET del mismo origen** | `/api/sesion` pasó a POST. Antes la guarda de origen rechazaba la petición del propio widget con un 403 |
| `display:flex` le gana al `[hidden]` de la hoja del navegador | El panel arrancaba abierto. `.panel[hidden]{display:none}` aparte                                       |
| Los textos de la base traen los saltos de línea de Prettier   | Se «desenvuelven» al compilar, o la respuesta sale cortada por donde cayó el formateador                |
| El modelo cuela negritas pese a la regla del prompt           | Regla 11 explícita **y** limpieza en el widget. Las dos: el prompt pide, el código garantiza            |

## Marca y accesibilidad

- **Shadow DOM**: se instala en sitios ajenos; su CSS no puede tocar la página ni
  la página tocarlo a él.
- **Sin coral**: es exclusivo del CTA global del nav (C2). Manda el azul mezclado
  `#144A96`.
- En móvil es **hoja inferior**, no ventana flotante.
- Foco atrapado en el panel y devuelto al botón al cerrar; `Escape` cierra.

## Restricciones

- Cero dependencias, también en el widget: JavaScript plano, sin compilación,
  igual que las landings.
- El widget **degrada siempre** al enlace de contacto.
