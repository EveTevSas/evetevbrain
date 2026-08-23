# Catálogo de Eve-Store

`catalogo.json` es la **fuente de verdad** del catálogo. Sale de una importación
de una sola vez del reporte de Mercado Libre (23-ago-2026) hecha por
`normalizar.py`, que se guarda para que la derivación sea auditable: nadie
debería tener que preguntarse de dónde salió un precio.

```bash
python3 apps/eve-store/catalogo/normalizar.py \
  ~/Documents/Agente-Mercadolibre \
  "~/Documents/Inventario Mercadolibre/Inventario_Completo.csv"
```

El script no se vuelve a correr en cada despliegue ni es un sincronizador. El
día que haya que releer Mercado Libre se hará contra su API.

## Qué entró

|                            |                                                                |
| -------------------------- | -------------------------------------------------------------- |
| Publicaciones en el origen | 46                                                             |
| Productos tras normalizar  | **25**                                                         |
| Con existencias hoy        | 24                                                             |
| Marcas                     | Bio Essens, Dermanat, Botanikalia, Ilovepinch, Allen Nutrition |

Casi la mitad de las publicaciones eran duplicados: cada producto está publicado
dos o más veces en Mercado Libre —una dentro de su catálogo y otra fuera—, y el
origen las trae como filas independientes. Publicar eso tal cual habría creado
veintiún productos fantasma que compiten entre sí.

## Lo que decidió el script, y por qué

**Agrupa por GTIN, no por el número de ítem del origen.** El origen mete dos
productos distintos bajo el ítem 19: un Serum Radiante de Botanikalia a $54.800
y un Serum Antiarrugas de Dermanat a $52.000, con GTIN y marca distintos. Un
agente que los viera fusionados no podría cruzar ninguno de los dos con el mismo
producto en otro sitio, que es justo para lo que sirve el GTIN.

**Pero dos GTIN pueden ser un producto.** La Espuma Limpiadora de Dermanat
aparece con `760412931223` —una publicación de 2024, sin existencias— y con
`7709555831185` —tres de 2026, con todo el stock—. Mismo nombre, misma marca,
mismo precio: es un cambio de código de barras. Se fusionan, el vigente manda y
el viejo queda en `gtin_historicos`, que es lo que permite seguir cruzando el
producto con quien aún lo tenga registrado con el código anterior.

**El slug lleva la marca.** Sin ella, los dos serums con vitamina C colisionan en
la misma URL. El script falla en vez de publicar si detecta un slug repetido.

**Marca normalizada.** El origen escribe «Bioesens» y «Bio Essens» para la misma
marca, y «Demanat» es un error de tecleo. Para un agente, dos grafías son dos
marcas.

**Precio como cadena numérica** (`"52000"`) con la moneda ISO aparte, que es lo
que exige `schema.org/Offer`. Nunca `"$52.000"`.

## Las existencias salen del inventario físico, no de Mercado Libre

Es la corrección más importante del catálogo. Las publicaciones pausadas
muestran cero aunque haya producto en bodega: con el stock de Mercado Libre solo
**11 de 25** productos tenían existencias; con el inventario real son **24**.
Publicar catorce fichas agotadas que no lo están le enseña a los motores un
catálogo muerto.

El único producto en cero es el Serum Radiante de Botanikalia, y por un motivo
que hay que resolver: **el inventario trae una sola línea de «Serum Fac con
Vitamina C» bajo Dermanat**, y en Mercado Libre son dos productos de marcas
distintas. Las cinco unidades se asignaron al de Dermanat porque es el que
coincide con el proveedor; si en realidad están repartidas, hay que corregirlo.

## Las descripciones

Las escribe una persona y viven en `descripciones.json`, **no** en
`catalogo.json`. El normalizador las lee y las mezcla; nunca las genera ni las
pisa. Si vivieran en el archivo generado, la siguiente ejecución borraría el
trabajo de redacción, que es la parte cara.

Las 25 actuales se redactaron a partir del texto truncado del origen y **todas
están marcadas `descripcion_por_confirmar: true`**. Ninguna debería publicarse
sin que alguien de la compañía la lea.

Dos reglas al redactarlas:

**No se repite el volumen en el texto.** El origen se contradice consigo mismo:
dice 420 ml donde el producto es de 400, 500 ml donde es de 250, y 120 ml en un
producto que se vende por 120 g. El contenido es un campo estructurado; meterlo
además en la prosa multiplica por dos las oportunidades de mentir.

**No se trasladaron afirmaciones terapéuticas.** El texto de Mercado Libre decía
cosas como «alcaliniza la sangre», «potencia la memoria», «previene enfermedades
cardiovasculares», «alivia dolores de artritis» o «propiedades antibacterianas,
antimicóticas y antivirales». En Colombia eso es terreno del INVIMA, y el riesgo
lo absorbía Mercado Libre — en nuestra propia tienda lo asumimos nosotros. Los
cuatro productos afectados llevan un aviso: recuperarlas es una decisión
regulatoria, no de redacción.

## Lo que sigue sin resolver

**Nueve productos sin contenido declarado.** En cosmética el volumen no es un
adorno: es lo que permite comparar precio entre presentaciones.

**Un volumen contradictorio.** El Aceite de Coco Orgánico figura como 400 ml en
una publicación y 420 ml en otra. Hay que mirar el envase.

**Tres productos con dos GTIN sin decidir**, distintos del caso de la Espuma.

**Treinta de las 46 publicaciones están pausadas en Mercado Libre.** No afecta a
Eve-Store, pero conviene saber si es deliberado antes de abrir dos canales con
inventario compartido.

## Campo por campo

| Campo                           | Para qué                                                                                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`                          | La URL. Único, comprobado por el script.                                                                                                                                                                          |
| `gtin` / `gtin_historicos`      | Identidad del producto entre sitios.                                                                                                                                                                              |
| `precio`, `moneda`              | `schema.org/Offer`, sin formato.                                                                                                                                                                                  |
| `existencias`, `disponibilidad` | La disponibilidad va como URL de schema.org, no como texto.                                                                                                                                                       |
| `atributos`                     | De la hoja «Ficha Técnica» del origen: tipo de piel, beneficios, zona y momento de aplicación, formato, si es vegano o libre de crueldad. Son los campos que un agente compara y los filtros que una persona usa. |
| `origen`                        | Publicaciones de Mercado Libre de las que salió, su estado y las ventas históricas. Permite rastrear cualquier dato hasta su fuente.                                                                              |
| `avisos`                        | Lo que necesita decisión humana. **Un producto con avisos no debería publicarse sin revisarlos.**                                                                                                                 |
