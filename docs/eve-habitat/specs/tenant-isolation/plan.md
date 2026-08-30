# Plan — Aislamiento multi-tenant

1. Fijar el contrato Zod y los tipos compartidos.
2. Modelar constraints, índices y RLS en PostgreSQL.
3. Implementar el caso de uso sin modelos del proveedor en el dominio.
4. Exponer la frontera HTTP versionada y auditable.
5. Derivar pruebas de los identificadores EARS y ejecutar casos negativos.
6. Validar el recorrido en la PWA cuando exista una interacción de usuario.
