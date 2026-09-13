# Decisiones de asamblea

## Propósito

Convertir la etapa "Cumplimiento" (`follow_up`), hoy tres compromisos fijos generados por
código y visibles solo cuando `assembly.status === "closed"`, en un seguimiento real:
administración asigna compromisos concretos (con responsable y fecha límite) derivados de
la asamblea ya cerrada y con acta formalizada, el consejo supervisa su avance, y
administración deja constancia de la evidencia. Es el último de los cinco componentes
decorativos del "corazón deliberativo" señalados al iniciar este trabajo.

## Marco de referencia

`CONTEXTO_RELEVO_EVECONECTA.md`: la sexta etapa del expediente es "Cumplimiento/seguimiento"
y la capacidad "seguimiento de decisiones" se describe como "responsables, vencimientos,
presupuesto y evidencias". La copia ya existente en la interfaz (`FollowUpStage`, aunque
decorativa) fija el reparto de roles que esta spec formaliza: "El consejo supervisa su
ejecución y la administración aporta evidencias". Depende de
`specs/eve-conecta/acta-y-cierre-asamblea` (una decisión solo existe una vez formalizada el
acta) y opcionalmente de `specs/eve-conecta/orden-del-dia-editable` (puede citar el punto
del orden del día del que se origina).

## Reglas

1. Una decisión (compromiso) solo puede crearse cuando la asamblea está `cerrada` y su
   acta está `firmada` o `publicada` — mientras el acta sigue en `borrador`, la sesión aún
   no tiene un registro formal del que derivar compromisos.
2. Solo `super_admin`/`admin_conjunto` crean, editan, eliminan decisiones y registran su
   evidencia. `super_admin`/`admin_conjunto` y `consejo` pueden actualizar el estado de
   avance (pendiente → en progreso → completada) — esta es la "supervisión" que ya anuncia
   la interfaz.
3. Cada decisión exige un responsable — un asistente acreditado de esa misma asamblea (no
   texto libre), igual que la presidencia y secretaría del acta — y una fecha límite.
   Opcionalmente cita el punto del orden del día del que se origina.
4. Una vez marcada `completada`, la decisión queda cerrada: ni su estado ni sus datos
   (título, responsable, fecha) vuelven a cambiar, y no puede eliminarse — es el mismo
   registro histórico irreversible que ya aplica al resto del expediente al cerrarse. La
   evidencia es la única excepción: puede seguir documentándose después de completar la
   decisión, porque la evidencia de cumplimiento normalmente llega después del hecho.
5. Antes de completada, administración puede editar título/responsable/fecha y eliminar la
   decisión si fue un error.
6. Visible para los cuatro roles solo cuando el acta ya está `publicada` (misma
   sensibilidad que el resto del contenido reconstruible del acta); mientras el acta está
   `firmada` pero no publicada, las decisiones ya creadas solo las ve administración.
7. La evidencia es una nota de texto (referencia, enlace o descripción de dónde consultar
   el soporte), no un archivo cargado — ver Fuera de alcance.

## Fuera de alcance

- Carga de archivos como evidencia: se registra una nota de texto (enlace o referencia),
  no un documento adjunto con su propio bucket de almacenamiento.
- Presupuesto/costeo de cada compromiso, mencionado en la descripción de la capacidad
  ("responsables, vencimientos, presupuesto y evidencias") pero fuera de este bloque —
  pertenece al módulo de presupuesto, no al de gobierno de asambleas.
- Notificaciones o recordatorios automáticos por vencimiento próximo o incumplido.
- Reabrir una decisión ya completada para corrección; el flujo es el mismo de "evento
  compensatorio" del resto del sistema, pero implementar la compensación específica queda
  fuera de este bloque — hoy simplemente queda inmutable.
