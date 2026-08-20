# @evetev/rag-assistant

**Fluxi** — el motor del asistente de IA que responde **solo** con lo que hay en
su base documental. En `evetev.com` se presenta como **Eve**, la mascota; Fluxi es
el nombre del motor, que es lo que se vende en marca blanca a otras empresas.

> El plan completo: [`docs/PLAN_ASISTENTE_FLUXI.md`](../../docs/PLAN_ASISTENTE_FLUXI.md).
> La spec de esta fase: [`specs/fluxi/base-documental/`](../../specs/fluxi/base-documental/).

## En qué punto va

**Fase 0 — base documental.** Aquí todavía **no hay código**: lo que existe es el
corpus y las reglas que lo gobiernan. El motor (recuperación híbrida, endpoint,
widget) entra en las fases 1 a 3.

```
apps/rag-assistant/
└── base/                 # ← lo único que existe hoy
    ├── _sistema.md       # prompt de anclaje
    ├── _limites.md       # temas que no responde, con la respuesta ya escrita
    ├── _selladas.md      # preguntas frecuentes con respuesta literal
    ├── _reglas.json      # las reglas de contenido, en forma legible por máquina
    ├── README.md         # manual de redacción — el que se le entrega al cliente
    ├── empresa/     (8)
    ├── evepay/     (12)
    ├── eveconecta/  (9)
    └── legales/     (3)
```

32 documentos consultables más cuatro archivos de configuración.

## Cómo se prueba hoy

Todavía no hay compilador (`scripts/compilar.ts` es la tarea T7). Mientras tanto,
la comprobación que ya corrió sobre este corpus es la del manual de redacción:
frontmatter completo, identificadores únicos y las seis reglas de contenido de
`_reglas.json`. **El corpus v1 pasa las seis.**

## Lo que este README dirá cuando haya motor

Cómo compilar el índice, cómo correr la evaluación, cómo desplegar y qué
variables de entorno pide. Nada de eso existe todavía y no se documenta por
anticipado.
