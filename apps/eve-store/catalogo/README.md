# Catálogo de Eve-Store

`catalogo.json` es la **fuente de verdad** del catálogo. Sale de una importación
de una sola vez del reporte de Mercado Libre (23-ago-2026) hecha por
`normalizar.py`, que se guarda para que la derivación sea auditable: nadie
debería tener que preguntarse de dónde salió un precio.

```bash
python3 apps/eve-store/catalogo/normalizar.py ~/Documents/Agente-Mercadolibre
```

El script no se vuelve a correr en cada despliegue ni es un sincronizador. El
día que haya que releer Mercado Libre se hará contra su API.

## Qué entró

|                            |                                                                |
| -------------------------- | -------------------------------------------------------------- |
| Publicaciones en el origen | 46                                                             |
| Productos tras normalizar  | **25**                                                         |
| Con existencias hoy        | 11                                                             |
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

## Lo que falta, y no lo puede resolver un script

**Las 25 descripciones.** Ninguna del origen es publicable, por dos motivos
independientes: vienen **cortadas a 503 caracteres** —el reporte las trunca, el
texto completo está en Mercado Libre— y **doce contienen texto y enlaces a la
eshop de Mercado Libre**. Copiarlas sería publicar un anuncio de otro canal en
nuestra propia tienda, y además dejar contenido duplicado.

Por eso `descripcion` viene en `null` y el texto original queda aparte, en
`descripcion_origen_truncada`, solo como material de partida. **Rellenarlas
automáticamente sería inventar**, que es exactamente lo que prohíbe el prompt de
auditoría que escribimos: cada descripción necesita al menos 150 caracteres
propios y los escribe una persona.

**Nueve productos sin contenido declarado.** En cosmética el volumen no es un
adorno: es lo que permite comparar precio entre presentaciones.

**Un volumen contradictorio.** El Aceite de Coco Orgánico figura como 400 ml en
una publicación y 420 ml en otra. Hay que mirar el envase.

**Tres productos con dos GTIN sin resolver**, distintos del caso de la Espuma.

**Las existencias no cuadran con el inventario.** El propio resumen del origen
compara su stock con el de Mercado Libre y catorce productos no coinciden; el
Glow Tonic difiere en veinte unidades. El plan exige que el feed refleje
existencias con quince minutos de retraso como máximo, y esa ventana no sirve de
nada si el número de partida ya está mal. **Antes de la fase 2 hay que decidir
qué sistema manda sobre el inventario.**

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
