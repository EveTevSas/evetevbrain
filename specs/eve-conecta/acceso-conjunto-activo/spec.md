# Autorización por conjunto activo

## Propósito

Garantizar que el rol con el que se autoriza cada petición sea siempre el de la membresía
del conjunto activo del usuario, resuelto de una única forma en el middleware, los layouts
del portal y la API interna. Corrige la brecha en la que el middleware autorizaba rutas con
el rol de la primera membresía e ignoraba el conjunto activo.

## Criterios de aceptación (EARS)

1. **CUANDO** un usuario con membresías en varios conjuntos tenga un conjunto activo en su
   cookie, **EL sistema DEBERÁ** autorizar rutas, páginas y API con el rol de ese conjunto.
2. **CUANDO** la cookie apunte a un conjunto sin membresía activa del usuario, **EL sistema
   DEBERÁ** ignorarla y usar la membresía activa más antigua.
3. **CUANDO** no exista cookie de conjunto activo, **EL sistema DEBERÁ** usar la membresía
   activa más antigua.
4. **CUANDO** el rol de la membresía elegida no sea uno de los roles vigentes, **EL sistema
   DEBERÁ** negar el acceso.
5. **CUANDO** cambie la lógica de selección de membresía, **EL sistema DEBERÁ** cambiarla en
   un único módulo compartido, no por copia en cada capa.

## Nota

La selección del conjunto activo (`POST select-tenant`) ya validaba la membresía antes de
fijar la cookie; esta spec cubre la lectura coherente de esa cookie en todas las capas.
