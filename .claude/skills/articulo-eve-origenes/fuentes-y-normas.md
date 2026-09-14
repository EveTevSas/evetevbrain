# Fuentes y normas

## Jerarquía de fuentes

De más a menos peso. Cada artículo lleva **al menos 3**, y **al menos 2** de los
tres primeros tipos.

| `tipo`        | Qué es                                                            | Dónde buscar                                  |
| ------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `revision`    | Revisión sistemática, metaanálisis o revisión narrativa publicada | PubMed (filtro _Review_), Cochrane Library    |
| `ensayo`      | Estudio original publicado: ensayo clínico, cohorte, laboratorio  | PubMed, PMC (texto completo abierto)          |
| `institucion` | Organismo sanitario, regulador o sociedad científica              | INVIMA, Minsalud, OMS, IDEAM, AAD, EFSA, NIH  |
| `periodismo`  | Medio con sección de salud o ciencia y autor identificable        | Solo para contexto o actualidad, nunca solo   |
| `experto`     | Opinión firmada de un especialista con credenciales verificables  | Solo para completar, nunca para un dato clave |

Reglas:

- **Un dato de salud se apoya en `revision`, `ensayo` o `institucion`.**
  Periodismo y expertos sirven para contexto («la tendencia en redes»), no para
  «reduce la pérdida de agua de la piel».
- **Un estudio de laboratorio o en animales no dice nada de tu piel.** Se puede
  contar, pero diciendo que es de laboratorio. «En células cultivadas» no se
  convierte en «ayuda a tu piel».
- **Tamaño y tipo importan.** Un ensayo con 20 personas se cuenta como lo que es.
- **Preferir lo reciente**, salvo que lo antiguo sea la referencia del campo.
- **Nada de blogs de marcas**, tiendas, webs de «bienestar» sin autor, ni
  Wikipedia como fuente (sí para encontrar fuentes).
- **Nada de URL con `utm_`** ni acortadores: la URL canónica de la fuente.
- Si una fuente es de un fabricante del producto del que se habla, se dice.

## Cómo se cita

En la cabecera, por cada fuente:

```yaml
- id: 1
  tipo: ensayo
  titulo: "Título exacto del estudio"
  autores: "Apellido A, Apellido B, et al."
  editor: "Nombre de la revista o institución"
  anio: 2014
  url: "https://pubmed.ncbi.nlm.nih.gov/12345678/"
  doi: "10.1111/xxxx.12345" # si tiene
  cita: "Frase copiada letra por letra de la página de la URL."
  respalda: "Qué afirmación del artículo sostiene esta fuente."
```

- `cita` es **literal**, del texto que devuelve esa `url`. `blog:fuentes` la
  busca ahí. Si la frase está en el PDF y no en la página, la `url` es la del
  PDF o se elige otra frase que esté en la página.
- En inglés, la cita va en inglés. La paráfrasis en español es el artículo.
- En el cuerpo, `[n]` detrás de la frase que usa la fuente, antes del punto:
  «…reduce la pérdida de agua [2].»
- Una fuente puede sostener varias frases. Una frase puede llevar dos notas.
- **Parafrasear no es estirar.** Si el estudio dice «mejoró la hidratación en
  pacientes con xerosis leve», el artículo no dice «hidrata cualquier piel seca».

## Normas que el artículo no puede saltarse

### Cosméticos — Decisión 833 de la CAN (2018)

Reglamentada en Colombia por la Resolución 2108 de 2019. En su publicidad no se
pueden atribuir a un cosmético «características, propiedades o acciones que no
posean, o que excedan de las funciones cosméticas», ni propiedades curativas o
terapéuticas.
Fuente: https://www.invima.gov.co/biblioteca/decision-833-armonizacion-legislaciones-cosmeticos-can

En la práctica:

- **Nunca** «cura», «trata», «elimina el acné», «previene infecciones»,
  «propiedades medicinales», referido a un producto o a un uso que el lector
  pueda hacer en casa.
- **Sí** se puede contar lo que dice un estudio clínico sobre una afección
  («en un ensayo con personas con dermatitis atópica…»), dejando claro que es un
  estudio y no una promesa, y **sin CTA a continuación**.
- Un cosmético hidrata, suaviza, limpia, protege del sol si está formulado como
  protector. Hasta ahí.

### Suplementos dietarios — Decreto 3249 de 2006

Su publicidad no puede presentar indicaciones preventivas, de rehabilitación o
terapéuticas, y **debe ser aprobada previamente por el INVIMA**.
Fuente: https://www.invima.gov.co/biblioteca/decreto-3249-2006-suplementos-dietarios

En la práctica: **ningún CTA ni enlace de compra a un suplemento** (hoy, Allen
Nutrition y el Aceite de Linaza de Bio Essens, que tiene registro SD). Se puede escribir sobre nutrición o suplementación como tema, con
fuentes, sin llevar a la compra. El verificador lo bloquea: reconoce un
suplemento por el prefijo SD de su registro sanitario, que lee de la base, y por
la marca. En CI no hay base y solo ve la marca, así que hay que correrlo en local.

### Publicidad identificable — SIC

La _Guía de buenas prácticas en la publicidad a través de influenciadores_ de la
SIC parte de que el consumidor tiene que poder identificar un mensaje
publicitario y de que no se debe ocultar su naturaleza comercial.
Fuente: https://www.sic.gov.co/content/gu%C3%ADa-de-buenas-pr%C3%A1cticas-en-la-publicidad-trav%C3%A9s-de-influenciadores

En la práctica: la plantilla del blog muestra en cada artículo que Evetev vende
productos mencionados. **No se quita** ni se matiza en el texto («no es
publicidad», «opinión independiente»): no lo es.

> Estas notas resumen normas reales pero **no son asesoría legal**. Lo que
> dependa de una interpretación —si un artículo concreto cuenta como publicidad
> de un suplemento, por ejemplo— lo decide un abogado, no la skill. Ante la
> duda, se aplica la lectura más estricta.
