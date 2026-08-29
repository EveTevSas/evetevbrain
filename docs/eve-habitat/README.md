# Eve-Habitat — el archivo del repositorio anterior

Esto es lo que se rescató de `Evetev-Dev/Eve-Habitat` antes de borrarlo. No es
código vivo: es **la memoria de por qué las cosas son como son**.

Eve-Habitat fue el monorepo que precedió a este. Su código sigue vivo aquí, con
otros nombres —el portal de residentes es `apps/eveconecta` y la API es
`apps/api`—, pero su documentación no viajó con él. Al ir a borrar el repo
apareció que estos 56 archivos **no existían en ningún otro sitio**: se habrían
perdido sin que nadie lo notara hasta necesitarlos.

```
adr/          8 decisiones de arquitectura, con su contexto y sus alternativas
specs/       14 specs de comportamiento (una carpeta por caso)
ARQUITECTURA.md   cómo estaba montado el sistema
SEGURIDAD.md      el modelo de amenazas y las decisiones que salieron de él
FASE_1..4_*.md    el estudio de mercado y el plan de producto, en cuatro fases
```

## Qué sigue valiendo y qué no

**Los ADR valen casi todos.** Explican decisiones que este monorepo heredó sin
volver a discutir: RLS en Supabase para aislar inquilinos (ADR-001), el
monolito modular y dónde están sus fronteras (ADR-003), Wompi/Akua como
proveedor de pagos (ADR-004), el libro en doble partida (ADR-007), el patrón
outbox/inbox para eventos (ADR-008). Cuando alguien pregunte «¿por qué esto
está así?», la respuesta suele estar aquí.

**Las specs valen como referencia, no como contrato.** Describen el
comportamiento que se especificó entonces —conciliación, cuórum de asamblea,
idempotencia del pago, sincronización de portería sin red—. Parte se implementó
y parte no. Antes de tratar una como verdad, hay que contrastarla con el código.

**El nombre no.** «Eve-Habitat» ya no se usa para nada de cara afuera. El
producto de conjuntos residenciales es **EveConecta**. El rastro que queda son
las rutas `/v1/habitat/*` de la API, que siguen llamándose así por dentro.

**Los `ESTANDARES_INGENIERIA-EVETEV.md` no están aquí a propósito**: su versión
viva es `docs/ESTANDARES_INGENIERIA.md`, que es más larga y está más al día.
Se compararon línea a línea antes de descartar la vieja.
