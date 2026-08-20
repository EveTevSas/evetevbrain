# Recuperación híbrida y compuerta de abstención

## Problema

Fluxi tiene que encontrar, entre los fragmentos de la base, los pocos que
responden la pregunta — y **saber cuándo ninguno lo hace**. Lo segundo importa
más que lo primero: un asistente que recupera mal responde peor; un asistente que
no sabe abstenerse **inventa**.

## Usuarios / actores

| Actor                    | Qué espera                                                             |
| ------------------------ | ---------------------------------------------------------------------- |
| Quien pregunta           | Que le respondan lo que preguntó, o que le digan claro que eso no está |
| El modelo generador      | Recibir solo material que sustente una respuesta, o no ser llamado     |
| Quien opera el asistente | Que abstenerse sea barato: cero tokens, cero riesgo                    |

## Resultado esperado

Una consulta entra y sale por uno de **cuatro caminos**, y dos de ellos no llegan
al modelo:

1. **Sellada** — coincide con una pregunta frecuente; sale la respuesta literal.
2. **Límite** — toca un tema vetado; sale el texto fijo de `_limites.md`.
3. **Abstención** — no hay material que alcance el umbral; sale la derivación.
4. **Generar** — hay material; se entregan hasta seis fragmentos al modelo.

## Requisitos funcionales

- Recuperación **léxica** con BM25 precompilado (k1 = 1.5, b = 0.75), en proceso y
  sin red.
- Recuperación **densa** con el coseno contra vectores int8 de 512 dimensiones.
  _Pendiente: necesita el proveedor de embeddings._
- **Fusión RRF** con k = 60 sobre las listas disponibles.
- **Compuerta** con dos señales independientes; basta con que una pase.
- Tokenizador español conservador: sin tildes salvo la eñe, sin vacías, sin
  palabras de menos de tres letras, y plural simple removido.

## No-objetivos

- **Reordenador neuronal.** Con seis candidatos sobre setenta y dos fragmentos
  añade una llamada de red para ganar poco. La costura queda hecha.
- **Expansión de consulta con el modelo.** Duplicaría la latencia del camino más
  frecuente.
- **Historial en la recuperación.** La v1 recupera sobre la pregunta del turno.

## Casos borde

- **Pregunta vacía o solo vacías** → cobertura 0 → abstención.
- **La persona usa otro vocabulario que la base** (dice «plata» donde la base dice
  «dinero»). Con solo BM25 esto **se abstiene**, y es el hueco que cierra la mitad
  densa. Está escrito como test para que el día que entren los vectores falle y
  haya que cambiarlo.
- **Sellada contenida en una pregunta más larga.** El solape se exige en las dos
  direcciones, o «¿cómo cobran?» se llevaría cualquier pregunta que la contenga.
- **Documento vencido** entre los recuperados → baja a confianza media y la
  respuesta añade la derivación a una persona.

## Criterios de aceptación (EARS)

- **CUANDO** ni la cobertura léxica ni el coseno del mejor fragmento alcanzan su
  umbral, **EL** sistema **DEBERÁ** devolver la derivación de `_limites.md` **sin
  llamar** al modelo generador.
- **CUANDO** la consulta coincide con una pregunta sellada en ambas direcciones
  por encima del umbral, **EL** sistema **DEBERÁ** devolver su respuesta literal
  sin llamar al modelo.
- **CUANDO** la consulta contiene una señal de un tema vetado, **EL** sistema
  **DEBERÁ** devolver el texto fijo de ese tema sin llamar al modelo.
- **CUANDO** se recupera con éxito, **EL** sistema **DEBERÁ** entregar como mucho
  el número de fragmentos del tope, ordenados por la fusión.
- **CUANDO** solo hay lista léxica disponible, **EL** sistema **DEBERÁ** funcionar
  igual, decidiendo con la cobertura sola.

## Restricciones de la constitución

- **§1.5 — no sobre-ingeniar.** BM25, coseno y RRF son código propio; cero
  dependencias en el camino caliente.
- **§2 — TypeScript estricto**, con `noUncheckedIndexedAccess`.
- **§9 — SDD.** Cada criterio EARS de arriba tiene su test en
  `src/responder.spec.ts` o en los specs de cada pieza.
