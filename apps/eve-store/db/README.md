# Schema `tienda`

La fuente de verdad del catálogo de Eve-Store. Vive aparte de `evepay` y de
`conjuntos` por la regla de la constitución: **el dominio de la vertical vive
con la vertical**. EvePay no sabe qué es un producto, y esta tienda no lee
tablas de `evepay` — pregunta por HTTP.

```bash
psql -d "$DATABASE_URL" -f apps/eve-store/db/0001_tienda.sql
```

## Por qué el catálogo deja de vivir en un JSON

`apps/eve-store/catalogo/catalogo.json` sirvió para importar y **queda como
artefacto de importación, no como fuente**. Un panel de administración que
escriba en un archivo versionado en git es un panel que no se puede usar sin
hacer commit.

## Tres decisiones que conviene no deshacer

**El dinero se guarda como lo guarda EvePay:** entero en la unidad mínima.
Para COP la unidad mínima es el valor face —`52000` son $52.000—, tal como
declara el comentario de `montoMinor` en la API. Guardarlo como pesos×100
mandaría a EvePay pedidos cien veces mayores, y ese error no lo atrapa ninguna
prueba de la tienda porque dentro de la tienda todo cuadra.

**Los avisos son una tabla, no un comentario.** Son la cola de trabajo del
panel: cada producto importado llega con descripciones sin confirmar, contenido
ausente o GTIN en conflicto. Tienen `resuelto_en` y `resuelto_por` porque
resolverlos es trabajo con responsable.

**La regla de publicación vive en la base.** Un producto con avisos bloqueantes
sin resolver no se puede marcar como publicado: lo impide un disparador. Está
ahí y no en la aplicación por la misma disciplina que gobierna a Fluxi —ningún
requisito se da por cumplido porque el código «debería» cumplirlo—. Un import,
un script de migración o un panel futuro pueden saltarse una validación de
aplicación; no pueden saltarse un disparador.

## Comprobado contra Postgres, no deducido

Cargando los 25 productos reales en una base local:

|                         |                                     |
| ----------------------- | ----------------------------------- |
| Productos               | 25                                  |
| Avisos                  | 45                                  |
| Publicaciones de origen | 46                                  |
| Valor del inventario    | $9.455.200 COP — cuadra con el JSON |

Y la regla de publicación se probó en los dos sentidos:

```
update tienda.producto set publicado=true where slug='dermanat-glow-tonic-…';
ERROR:  No se puede publicar «dermanat-glow-tonic-…»: tiene 2 aviso(s)
        bloqueante(s) sin resolver.
```

Tras resolver esos dos avisos, la misma sentencia pasa. Un guardia que no se
puede hacer fallar no comprueba nada.

## Estado del catálogo al importar

**Los 25 productos están bloqueados** por 45 avisos pendientes. Eso no es
un defecto del import: es el trabajo real que el panel existe para resolver.
