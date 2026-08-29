# Exportación integral del tenant

## Objetivo

Producir un paquete legible fuera de Eve-Habitat con manifiesto de integridad.

## Requisitos EARS

1. **EXPORT-001** — CUANDO un administrador solicita exportación, EL SISTEMA DEBERÁ incluir conteos de todas las áreas del tenant.
2. **EXPORT-002** — CUANDO se genera el manifiesto, EL SISTEMA DEBERÁ calcular un checksum SHA-256.

## Invariantes

- Nunca incluye datos de otro tenant.
- El manifiesto declara versión y fecha.
- La preparación genera auditoría.

## Evidencia de aceptación

- Endpoint `/v1/habitat/export`.
- Checksum y resumen por sección.
- Prueba EXPORT-001.
