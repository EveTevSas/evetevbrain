# Voto autoservicio de asamblea

## Propósito

Hoy todo voto lo teclea la mesa (administración) uno por uno, incluso cuando hay
decenas de unidades acreditadas — es lento y no escala. Este bloque agrega un canal
de **autoservicio**: el propio asistente acreditado (propietario o apoderado) emite su
voto desde su dispositivo mientras el punto está abierto, sin que la mesa tenga que
preguntarle y digitarlo. El registro por mesa no desaparece — sigue siendo el
respaldo obligatorio para quien no puede o no quiere votar por su cuenta (el caso
típico es el adulto mayor sin celular).

Debe funcionar igual de fluido en las tres modalidades en que hoy se convocan
asambleas — 100% presencial, 100% virtual e híbrida — porque EveConecta no puede
asumir cuál eligió cada copropiedad.

## Marco de referencia

Depende de `specs/eve-conecta/votacion-real-asamblea` (el mecanismo de conteo, cierre
y umbral que este bloque no cambia, solo le agrega un segundo canal de entrada) y de
`specs/eve-conecta/poderes-y-acreditacion-asamblea` (de ahí sale quién está acreditado,
con qué calidad, y a quién representa si es apoderado).

Hallazgo de diseño clave: `conjuntos.asamblea_acreditaciones.persona_id` referencia
`conjuntos.personas`, no `auth.users` — y `personas.auth_usuario_id` es **nullable**.
La mayoría de propietarios y casi todos los apoderados ocasionales (el vecino al que
le delegaron el poder para una sola asamblea) no tienen cuenta en el portal. El
autoservicio no puede exigir que la tengan: el punto de partida es la acreditación
misma, no una sesión de usuario.

## Reglas

1. El autoservicio es un **segundo canal** para el mismo mecanismo de voto ya descrito
   en `votacion-real-asamblea` — no lo reemplaza. La mesa conserva su formulario de
   registro manual como respaldo permanente.
2. Solo puede votar por autoservicio quien tenga, en esa asamblea, una acreditación
   **activa** (`revocado_en is null`) con calidad `propietario` o `apoderado` — misma
   restricción que ya aplica al registro por mesa (`residente_con_voz` tiene voz, no
   voto; `invitado` tampoco vota).
3. El acceso no depende de tener cuenta en el portal:
   - Si la persona acreditada tiene `auth_usuario_id`, vota desde su sesión normal:
     cuando el punto se abre, le aparece un aviso "vota ahora" dentro de su vista de
     la asamblea.
   - Si no tiene cuenta, recibe un enlace de un solo propósito ligado a esa
     acreditación específica — no a una cuenta de usuario. El enlace solo funciona
     mientras la asamblea está `en_curso` y el punto al que apunta sigue abierto;
     fuera de esa ventana, es inválido.
4. Un apoderado acreditado para varias unidades tiene una votación pendiente **por
   cada unidad que representa** — se resuelven por separado porque cada unidad pesa su
   propio coeficiente, igual que si la mesa las registrara una por una.
5. Si la mesa ya registró un voto de respaldo para una unidad y luego esa misma unidad
   vota por autoservicio para el mismo punto (antes de que cierre), **el voto del
   asistente prevalece**: se aplica el mismo patrón ya establecido de "revocar y volver
   a registrar" (nunca se edita el voto original) para dejar vigente el emitido por el
   propio asistente.
6. El asistente siempre ve la confirmación de su propio voto emitido, incluso con la
   capacidad `secret_ballots` activa para la copropiedad. El secreto sigue aplicando
   igual que hoy frente a los demás asistentes y frente a la vista agregada — nunca
   frente a quien lo emitió. El registro persiste íntegro para auditoría, como ya
   ocurre hoy (ver regla 9 de `votacion-real-asamblea`); este bloque no cambia esa
   trazabilidad de base, solo garantiza que el propio votante la vea.
7. El mecanismo es idéntico en las tres modalidades — presencial, virtual e híbrida.
   Lo único que cambia es el punto de entrada visual (aviso en el portal si ya hay
   sesión abierta, o el enlace/QR si no la hay); la validación, el conteo y el cierre
   son los mismos sin importar cómo llegó el voto.
8. Todas las reglas de `votacion-real-asamblea` que no se mencionan aquí siguen
   aplicando sin cambios: coeficiente congelado en la acreditación, un voto por unidad
   por punto, cierre definitivo e irreversible, umbral calculado sobre sí/no.

## Fuera de alcance

- Herramienta dedicada para que administración consulte el voto de una unidad
  específica en disputas bajo `secret_ballots` — el registro ya persiste íntegro (regla
  6), pero exponerlo con una interfaz de consulta queda para otro bloque.
- Generación y proyección en pantalla del código QR — es mecánica de interfaz, se
  resuelve en el plan técnico, no cambia ninguna regla de negocio de este spec.
- Notificaciones por SMS/WhatsApp avisando que hay una votación pendiente; el aviso
  dentro del portal (regla 3) es lo único cubierto aquí.
- Verificación de identidad reforzada (biometría, doble factor) para el enlace de un
  solo propósito — el propio enlace es la única capa de acceso en este bloque.
- Votar sin acreditación previa: el flujo de acreditación sigue siendo el
  prerrequisito obligatorio: este bloque solo agrega un canal para emitir el voto de
  una acreditación que ya existe.
