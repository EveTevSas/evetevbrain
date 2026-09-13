# Guía de redacción de Eve-Orígenes

La guía original del equipo, con las decisiones tomadas el 13-sep-2026 marcadas
como **Decidido**. Donde la guía y una decisión chocan, manda la decisión.

## Qué es Eve-Orígenes

Eve-Orígenes Colombia es un portal web enfocado en el cuidado de la piel y un
estilo de vida saludable, que fomenta el uso de productos de alta calidad de
fabricación colombiana. Es de Evetev S.A.S., que vende algunos de esos
productos en su tienda.

Las temáticas pueden abarcar: cuidados de las diferentes clases de piel, cuidado
del cabello, protectores solares, dietas para mejorar la salud de la piel,
procesos de fabricación de los productos, noticias o avances científicos sobre
el cuidado de la piel, productos alimenticios y suplementos para mejorar la
calidad de vida, nuevos productos, y maquillaje de origen sustentable.

Los artículos pueden focalizarse territorialmente —los pisos térmicos de
Colombia piden cuidados distintos— y también por edades, profesiones, hábitos o
segmentos sociales.

**Decidido:** los suplementos se pueden tratar como tema, pero **nunca llevan
CTA** ni enlace a su compra. Ver `fuentes-y-normas.md`.

## 1. Encontrar el tema

El tema sale de tópicos que sean tendencia en el momento: una noticia, un evento
climático, una temporada, condiciones especiales. Herramientas:

- `blog:temas` — el autocompletado de Google y YouTube para Colombia, que es el
  método de la guía («escribir una palabra y ver qué sugiere el buscador»), sin
  cookies ni historial.
- https://trends.google.es/trends/?geo=CO
- https://www.google.com/shopping
- https://explodingtopics.com
- Tendencias de redes sociales.

Encontrado el tema, se delimita a un aspecto: de «cuidado de la piel seca» a
«protector solar para piel seca» o «piel seca si vas a la playa».

Después, una lista de palabras clave en tendencia para usar en el cuerpo.

**Decidido:** mezclar **pilares permanentes** (un artículo de fondo por
ingrediente del catálogo: aceite de coco, ácido hialurónico, retinol…) con
**satélites de tendencia** que enlazan a su pilar. Las tendencias caducan; los
asistentes de IA citan explicaciones que siguen vigentes.

## 2. Buscar la sustentación

Al menos 3 fuentes que sustenten lo que se dice, para no dar información falsa.
Se parafrasean en el cuerpo y se referencian al final.

**Decidido:** las fuentes no valen lo mismo. Al menos 2 de las 3 tienen que ser
revisiones científicas, estudios publicados o instituciones. Cada afirmación
concreta lleva su nota `[n]`, no solo una lista al final. Jerarquía y reglas en
`fuentes-y-normas.md`.

## 3. Estructurar el artículo

Entre **1000 y 2000 palabras**, con estilo carismático y amigable, y estas
partes:

- **Título** sugestivo y motivador, de 4 a 15 palabras. Puede ser una pregunta.
- **Gancho**: una frase o párrafo pequeño, amigable y motivador, que da contexto.
- **Introducción.**
- **Desarrollo** (varios párrafos, con apartados).
- **Conclusiones** o resumen.
- **Referencias.**

**Decidido:** además, una **respuesta corta** de 15–80 palabras arriba del
cuerpo. Es lo que un lector con prisa necesita y lo que un asistente de IA
puede citar sin resumir.

## 4. Enganchar al lector y llevarlo al producto

En varios lugares el artículo tiene CTA que llevan al lector —o a la IA— a la
tienda. Y los artículos se enlazan entre sí para que el lector se forme un
contexto: en uno sobre aceite de coco, si se nombran otros aceites, un enlace a
sus artículos (ajonjolí, higuerilla).

**Decidido:**

- **Franqueza**: el artículo habla del ingrediente, no de la marca; arriba de
  cada artículo la web dice que Evetev vende algunos productos mencionados (lo
  pinta la plantilla, no hay que escribirlo).
- **El CTA sí nombra el producto** (`::producto[slug]` lo muestra con nombre y
  precio): así lo puede conectar un agente de compra, y el lector sabe qué se le
  ofrece.
- **CTA solo donde la evidencia respalda el uso.** Si el estudio no dice que el
  aceite de higuerilla haga crecer el pelo, no hay CTA al aceite de higuerilla
  tras ese párrafo, aunque lo vendamos.
- Entre 1 y 3 CTA por artículo.

## 5. Pulir el artículo

Varias lecturas para encontrar faltas de coherencia, ritmo, errores de
ortografía o gramática, redundancias, errores tipográficos o uso inadecuado del
lenguaje. Redacción y ortografía perfectas. Escritura humana, sin los lugares
comunes de la IA: https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
(resumida y adaptada al español en `escritura.md`).

**Decidido:** los artículos los escribe la IA y no siempre habrá una persona
para leerlos, así que **la revisión final es obligatoria** y la hace un revisor
independiente (paso 6 de `SKILL.md`). Nada se publica sin su aprobado.
