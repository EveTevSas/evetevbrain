# Plantilla de artículo

Archivo: `apps/eve-store/contenido/articulos/<slug>.md`. El `slug` es el nombre
del archivo y la URL: minúsculas, sin tildes, palabras con guiones, y que diga
de qué trata (`aceite-de-coco-piel-seca-clima-frio`).

```markdown
---
titulo: "¿Sirve el aceite de coco para la piel seca en clima frío?"
descripcion: "Lo que dicen los estudios sobre el aceite de coco en piel seca, cuándo ayuda, cuándo no y cómo usarlo si vives en tierra fría."
gancho: "Bogotá amanece a ocho grados y la piel lo nota. Antes de untarte lo primero que encuentres, vale la pena saber qué dice la investigación."
respuesta_corta: "Una frase o dos, de 15 a 80 palabras, con lo esencial y sus matices. Nada que el cuerpo no sostenga."
estado: borrador
publicado_en: 2026-09-13
revisado_en: 2026-09-13
temas:
  - piel seca
  - aceites naturales
territorio: "clima frío de altura" # opcional
productos: # slugs de /producto/…; nunca suplementos
  - bio-essens-aceite-de-coco-organico-400-ml
relacionados: # slugs de otros artículos que existan
  - aceite-de-ajonjoli-para-la-piel
fuentes:
  - id: 1
    tipo: ensayo
    titulo: "Título exacto"
    autores: "Apellido A, Apellido B"
    editor: "Revista o institución"
    anio: 2004
    url: "https://pubmed.ncbi.nlm.nih.gov/00000000/"
    doi: "10.0000/xxxx"
    cita: "Frase literal de la página."
    respalda: "Qué afirmación sostiene."
# Solo al publicar, con lo que devuelve el revisor final:
# verificacion:
#   estado: aprobado
#   fecha: 2026-09-13
#   afirmaciones: 23
#   fuentes_abiertas: 4
---

Párrafo de introducción, sin título: plantea la pregunta del lector y qué va a
encontrar. Con datos desde la primera línea cuando los haya [1].

## Un apartado que diga lo que contiene

Desarrollo. Cada dato con su nota [2]. Un enlace a [otro artículo](/blog/otro-slug)
o a [una marca](/marca/bio-essens) donde venga a cuento.

::producto[bio-essens-aceite-de-coco-organico-400-ml]

## Otro apartado

Más desarrollo, con lo que no se sabe dicho claramente [3].

## Conclusiones

Lo esencial, con sus matices. Sin fórmulas de cierre.
```

Notas:

- **Las referencias no se escriben en el cuerpo**: la página las genera desde
  `fuentes`, con anclas `#fuente-n` a las que saltan las notas.
- **La advertencia de que Evetev vende productos mencionados** y la nota de que
  el artículo no sustituye a un profesional las pinta la plantilla. No se
  repiten en el texto.
- **Sin HTML ni título de nivel 1** en el cuerpo: el título es el de la cabecera.
- El último apartado de nivel 2 se llama «Conclusiones», «En resumen» o «Lo
  esencial».
