# Poderes y acreditación de asistentes en asambleas

## Propósito

Convertir la etapa "Asistencia y poderes" del expediente de asamblea, hoy decorativa,
en un registro real de quién asiste, en qué calidad y con qué coeficiente representa,
de modo que el quórum y la representación económica dejen de ser una fórmula fija y
se calculen desde acreditaciones reales.

## Marco de referencia

Retoma la visión de `docs/eve-habitat/FASE_2_BASICOS_Y_DIFERENCIADORES.md` §3.10
("registro de asistentes, poderes y coeficientes") y `FASE_3_PLAN_DESARROLLO_EVE_HABITAT.md`
§9.4 ("el quórum se calcula sobre asistentes/poderes vigentes... el sistema bloquea doble
representación"), y las capacidades ya definidas en `lib/assemblies.ts`
(`proxy_management`, `identity_accreditation`).

## Calidades de asistencia

| Calidad             | Requiere unidad                               | Requiere poder de                    | Cuenta para quórum/coeficiente |
| ------------------- | --------------------------------------------- | ------------------------------------ | ------------------------------ |
| `propietario`       | Sí, como propietario vigente                  | —                                    | Sí                             |
| `apoderado`         | Sí                                            | El propietario vigente de esa unidad | Sí                             |
| `residente_con_voz` | Sí, como vínculo vigente (cualquier relación) | —                                    | No — tiene voz, no voto        |
| `invitado`          | No                                            | —                                    | No                             |

Esta distinción opera la diferencia legal entre voz y voto (Ley 675): un residente sin
poder puede intervenir pero no representa el coeficiente de la unidad.

## Reglas

1. Una unidad tiene como máximo **una acreditación activa** por asamblea, sin importar
   la calidad. Corregir un error exige revocar la acreditación existente antes de crear
   otra — nunca hay dos filas activas para la misma unidad.
2. Solo `super_admin` y `admin_conjunto` acreditan y revocan (función de registro/mesa de
   entrada), igual que el resto de la gestión de asambleas.
3. El coeficiente aplicado se toma de `unidades.coeficiente` en el momento de acreditar
   y queda congelado en el registro (no cambia si el coeficiente de la unidad cambia
   después).
4. `apoderado` exige `representa_persona_id`: la persona debe tener un vínculo vigente
   como propietario de esa misma unidad, y no puede ser la misma persona que asiste.
5. `propietario` y `residente_con_voz` exigen que quien asiste (`persona_id`) tenga un
   vínculo vigente con la unidad indicada.
6. `invitado` no referencia ninguna unidad.
7. La corrección es por **revocación** (registra quién y cuándo), nunca por borrado.
8. El quórum de la asamblea (`quorumPercent`) y la representación por coeficiente
   (`representedCoefficientPercent`) se calculan sumando `coeficiente_aplicado` de las
   acreditaciones activas con calidad `propietario` o `apoderado`. Las unidades
   representadas (`representedUnits`) cuentan toda acreditación activa con unidad,
   cualquiera sea su calidad.
9. No se acredita después de que la asamblea quede `cerrada`.
10. Evidencia del poder (documento cargado por quien acredita) es opcional: un poder
    verbal o presentado en papel en el momento también es válido para el registro.
11. Un residente, el consejo o alguien sin membresía activa en la copropiedad nunca ven
    la lista de asistentes identificados — es información con el mismo nivel de
    sensibilidad que el censo de personas, ya restringido a administración.

## Fuera de alcance (pendiente de otro bloque o de decisión legal)

- Tope al número de poderes que puede acumular un mismo apoderado: la Ley 675 lo deja a
  cada reglamento de propiedad horizontal; no se codifica un límite universal. Debe
  parametrizarse por copropiedad y revisarse jurídicamente antes de producción, tal como
  ya advertía `FASE_3` §9.3-9.4.
- Auto-acreditación por el residente (check-in remoto sin mesa de entrada).
- Votación en vivo, acta y seguimiento de decisiones: quedan para bloques posteriores;
  esta spec solo entrega la base de asistentes/poderes de la que dependerán.
