# ADR-006: PWA antes que aplicaciones nativas

- Estado: Aceptada
- Fecha: 2026-07-18

## Contexto

Eve-Habitat debe cumplir los estándares de ingeniería EVETEV y operar con aislamiento, trazabilidad y bajo costo operacional.

## Decisión

Construir Next.js instalable con shell cacheable, snapshot local y cola limitada para portería. El modo offline no conserva cartera, documentos personales ni censo completo.

## Consecuencias

Una base de código cubre administración, residentes y portería; la exposición local se minimiza.
