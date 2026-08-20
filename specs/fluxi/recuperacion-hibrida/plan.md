# Plan — Recuperación híbrida

## Piezas

```
src/
├── normalizar.ts          # sinTildes — lo comparten tres capas
├── recuperar/
│   ├── texto.ts           # normalización + tokenizador español
│   ├── bm25.ts            # índice precompilado, búsqueda y cobertura
│   ├── rrf.ts             # fusión por rango recíproco (k = 60)
│   └── compuerta.ts       # la decisión de responder o abstenerse
├── selladas.ts            # preguntas frecuentes con respuesta literal
├── limites.ts             # temas vetados con respuesta fija
└── responder.ts           # el camino de una respuesta (los cuatro caminos)
```

## La corrección de diseño que salió al implementar

El plan decía «si el mejor **puntaje fusionado** no llega al umbral, no hay
llamada al modelo». **Eso no funciona.** RRF puntúa por **posición**: un primer
puesto vale `1/(60+1)` tanto si el fragmento responde perfectamente como si no
tiene nada que ver. Una compuerta sobre ese número abre siempre.

La separación correcta es:

- **la fusión decide el orden** — y para eso RRF es lo indicado, porque evita
  promediar escalas incompatibles;
- **la compuerta decide si se responde** — y para eso hacen falta señales crudas,
  cada una acotada y explicable.

Las dos señales:

| Señal                | Rango  | Qué mide                                                              |
| -------------------- | ------ | --------------------------------------------------------------------- |
| **cobertura léxica** | [0,1]  | proporción de términos de la pregunta presentes en el mejor fragmento |
| **coseno**           | [-1,1] | similitud del mejor fragmento denso                                   |

Basta con que **una** pase: fallan en sitios distintos, que es justamente por lo
que el híbrido existe. Umbrales de arranque 0,5 y 0,55, **sin calibrar**: son una
conjetura razonada hasta que exista el set dorado.

## Por qué la cobertura y no el puntaje BM25

BM25 no está acotado y su escala depende del corpus y del largo de la consulta:
un umbral sobre él habría que recalibrarlo cada vez que la base cambia — y la
base va a cambiar. La cobertura está en [0,1], se explica en una frase a un
cliente y sobrevive a que el corpus se reescriba entero.

## Decisiones del tokenizador

- **La eñe se conserva.** En NFD se descompone en `n` + U+0303, así que quitar
  todo el rango de marcas convertiría «año» en «ano».
- **Sin raíz morfológica agresiva.** Un stemmer fuerte junta «pasarela» con
  «pasar». Se quita el plural simple y nada más.
- **Todo se compara sin tildes, patrones incluidos.** Un documento escrito sin
  acentos esquivaba las reglas en silencio.

## Restricciones

- Cero dependencias en el camino caliente.
- El índice es un archivo del repositorio, no una base de datos.
- La mitad densa queda **sin conectar** hasta que haya proveedor de embeddings;
  el motor funciona degradado y lo dice.
