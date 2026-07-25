# specs/

Especificaciones de EvePay y sus verticales, versionadas junto al código
(Spec-Driven Development, constitución §9). Cada feature vive en su carpeta y
entra en el **mismo PR** que la implementa.

```
specs/
└── <feature>/
    ├── spec.md      # qué y por qué + criterios de aceptación (EARS)
    ├── plan.md      # arquitectura y restricciones
    └── tasks.md     # unidades implementables (mapean a ramas cortas)
```

**Spec obligatoria** para pagos, ledger, conciliación, multi-tenancy y RBAC.
Lo presentacional o desechable va con prompt directo (ver el gatillo en §9).

Los criterios se escriben en **EARS**: `CUANDO … EL sistema DEBERÁ …`, y cada uno
debería poder convertirse en un test. El roadmap completo está en
[`docs/PLAN_DESARROLLO_EVEPAY.md`](../docs/PLAN_DESARROLLO_EVEPAY.md).
