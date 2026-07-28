# specs/

Especificaciones versionadas junto al código (Spec-Driven Development, §9). Cada
feature vive en su carpeta y entra en el **mismo PR** que la implementa.

Organizadas **por dominio**, para dejar claro qué es del núcleo y qué de cada vertical:

```
specs/
├── evepay/          # núcleo — plataforma de pagos
│   └── <feature>/
│       ├── spec.md      # qué y por qué + criterios de aceptación (EARS)
│       ├── plan.md      # arquitectura y restricciones
│       └── tasks.md     # unidades implementables
└── eve-conecta/      # primera vertical — conjuntos residenciales
    └── <feature>/ …
```

**Spec obligatoria** para pagos, ledger, conciliación, multi-tenancy y RBAC (núcleo),
y para cuotas, aplicación de pagos, mora y visibilidad entre roles (vertical). Lo
presentacional o desechable va con prompt directo (ver el gatillo en §9).

Los criterios se escriben en **EARS** (`CUANDO … EL sistema DEBERÁ …`), y cada uno
debería poder convertirse en un test. El roadmap del núcleo está en
[`docs/PLAN_DESARROLLO_EVEPAY.md`](../docs/PLAN_DESARROLLO_EVEPAY.md); las reglas de
la vertical en [`docs/ESTANDARES_EVECONECTA.md`](../docs/ESTANDARES_EVECONECTA.md).
