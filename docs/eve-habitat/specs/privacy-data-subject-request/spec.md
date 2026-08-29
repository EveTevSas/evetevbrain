# Solicitudes de titulares

## Objetivo

Radicar y seguir solicitudes de acceso, corrección, supresión o revocación con retención legal.

## Requisitos EARS

1. **PRIVACY-001** — CUANDO una persona radica una solicitud, EL SISTEMA DEBERÁ asignar expediente, estado y vencimiento.
2. **PRIVACY-002** — CUANDO existe obligación legal de conservar, EL SISTEMA DEBERÁ documentar el motivo en vez de borrar silenciosamente.

## Invariantes

- El expediente pertenece al tenant.
- La resolución conserva fecha y fundamento.
- La auditoría no contiene el contenido sensible completo.

## Evidencia de aceptación

- Endpoint `/v1/habitat/privacy/requests`.
- Tabla `habitat.data_subject_requests` con RLS.
- Auditoría de radicación sin datos de documento.
