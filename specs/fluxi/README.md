# specs/fluxi/

Especificaciones de **Fluxi**, el motor del asistente RAG que vive en
[`apps/rag-assistant`](../../apps/rag-assistant). El mapa completo está en
[`docs/PLAN_ASISTENTE_FLUXI.md`](../../docs/PLAN_ASISTENTE_FLUXI.md).

Es un **producto**, no una vertical: `evetev.com` lo consume igual que lo haría un
cliente que lo compre.

| Spec                   | Fase | Estado                                                             |
| ---------------------- | ---- | ------------------------------------------------------------------ |
| `base-documental`      | 0    | **escrita** — formato, reglas de contenido y gobernanza del corpus |
| `recuperacion-hibrida` | 1    | por escribir — BM25 + densa, RRF y compuerta de abstención         |
| `generacion-anclada`   | 2    | **escrita** — prompt, verificación de citas, cifras y enlaces      |
| `guardas-y-cupos`      | 2    | por escribir — orígenes, límites, presupuesto y degradación        |
| `widget-embebible`     | 3    | por escribir — accesibilidad, marca y streaming                    |
| `evaluacion`           | 1–2  | por escribir — set dorado y umbrales de CI                         |
| `registro-y-mejora`    | 4    | por escribir — eventos y preguntas sin respuesta                   |
| `multi-cliente`        | 5    | por escribir — una instalación, varias bases                       |

**Spec obligatoria en todo Fluxi.** Aquí no hay «arreglo rápido»: un asistente que
afirma cosas sobre la compañía tiene el mismo problema que el dinero — el error no
se ve hasta que ya salió.
