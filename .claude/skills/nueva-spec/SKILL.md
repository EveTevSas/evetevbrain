---
name: nueva-spec
description: Crea la carpeta de una spec nueva (spec.md + plan.md + tasks.md, criterios EARS) en specs/<dominio>/<feature>/, siguiendo el SDD del §9. Usar antes de implementar pagos, ledger, conciliación, multi-tenancy, RBAC, cuotas, mora o cualquier feature de Fluxi.
---

# Nueva spec (Spec-Driven Development, §9)

Argumentos esperados: `<dominio> <nombre-feature>` — dominios válidos: `evepay`,
`eve-conecta`, `fluxi`. Ejemplo: `/nueva-spec evepay refunds-parciales`.

## Pasos

1. Confirmar que la feature **requiere** spec (ver `specs/README.md`): núcleo de
   pagos/ledger/conciliación/multi-tenancy/RBAC; en la vertical:
   cuotas/aplicación de pagos/mora/visibilidad entre roles; en Fluxi: siempre.
   Si es presentacional o desechable, decirlo y no crear la spec.
2. Crear `specs/<dominio>/<feature>/` con los tres archivos de abajo.
3. Rellenarlos con el contenido real de la feature — nunca dejar los
   placeholders. Mirar una spec existente como referencia de nivel de detalle:
   `specs/evepay/create-payment-idempotency/`.
4. La spec entra en el **mismo PR** que la implementación.

## spec.md

```markdown
# <Feature>

## Qué y por qué

<El problema que resuelve y por qué ahora. 2–4 párrafos.>

## Criterios de aceptación (EARS)

- CUANDO <condición>, EL sistema DEBERÁ <comportamiento observable>.
- CUANDO <condición de error>, EL sistema DEBERÁ <comportamiento seguro>.

<Cada criterio debe poder convertirse en un test. Numerarlos (CA-1, CA-2…) para
citarlos desde los tests.>

## Fuera de alcance

- <Lo que explícitamente NO cubre esta feature.>
```

## plan.md

```markdown
# Plan — <Feature>

## Arquitectura

<Dónde vive el código, qué módulos toca, qué contratos cambia (Zod en
@evetev/shared si aplica).>

## Restricciones

<Multi-tenancy, RLS, idempotencia, inmutabilidad del ledger — las que apliquen
y cómo se respetan.>

## Decisiones

<Alternativas consideradas y por qué se eligió esta.>
```

## tasks.md

```markdown
# Tareas — <Feature>

- [ ] T1 — <unidad implementable, con su test> (cubre CA-1)
- [ ] T2 — …
```

## Regla de trazabilidad

Cada criterio EARS (CA-n) debe aparecer citado en al menos una tarea, y el test
que lo cubre debe nombrarlo: `it("CA-1: rechaza el pago duplicado …")`.
