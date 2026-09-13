# Plan — Eve-Orígenes: identidad de la tienda y blog verificado

> Documento vivo, como el [plan de la tienda](PLAN_EVE_STORE.md). Recoge las
> decisiones del 12 y 13 de septiembre de 2026 y el porqué de cada una, para que
> nadie las deshaga por no conocerlas.

## 0. Qué es

**Eve-Orígenes** es la cara pública de la tienda de Evetev: un portal de cuidado
de la piel y vida saludable con productos de fabricación colombiana, con dos
partes que se sostienen entre sí:

- **La tienda** (`apps/eve-store`, la misma app de siempre), con la identidad del
  manual «SkinCare Orígenes», renombrado.
- **Un blog** de artículos que atraen lectores —y citas de asistentes de IA— con
  información contrastada, y que llevan a la tienda donde la evidencia lo
  justifica.

Es **una marca de Evetev S.A.S.** y lo dice en cada página. El código y el
paquete siguen llamándose `eve-store`; el nombre que ve el lector es
Eve-Orígenes.

## 1. Decisiones

| Decisión                                                             | Por qué                                                                                                                                                     |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un solo nombre ante el lector: Eve-Orígenes                          | Dos marcas para 24 productos dividen la atención.                                                                                                           |
| Colores: los que **se ven** en el manual, no los códigos que imprime | El manual tiene cinco muestras donde no coinciden (dos etiquetas copiadas, tres muestras transparentes). Ver `packages/brand/eve-origenes/README.md`.       |
| Tipografías libres: El Messiri, Didact Gothic, Caveat                | Century Gothic y la webfont de Jenna Sue son de pago. Las sustitutas se eligieron comparándolas contra el PDF.                                              |
| El logo se extrae del PDF, no se redibuja                            | Los trazos de la hoja son los del manual, curva por curva.                                                                                                  |
| Los artículos los escribe la IA                                      | No siempre hay alguien del equipo para leerlos.                                                                                                             |
| **Nunca se publica información incorrecta**                          | Por eso la verificación final es obligatoria y bloqueante (§3).                                                                                             |
| Franqueza: cada artículo dice que Evetev vende lo que menciona       | La guía de la SIC pide que la publicidad sea identificable. Decirlo da credibilidad.                                                                        |
| Los CTA nombran el producto                                          | Un agente de compra solo conecta artículo y producto si el nombre está.                                                                                     |
| CTA solo donde la evidencia respalda el uso                          | Vender algo no lo hace cierto.                                                                                                                              |
| Ningún CTA a suplementos                                             | El Decreto 3249 de 2006 exige aprobación previa del INVIMA para su publicidad.                                                                              |
| Sin afirmaciones terapéuticas                                        | La Decisión 833 de la CAN las prohíbe en cosméticos.                                                                                                        |
| La web dice que los artículos se redactan con IA                     | En la política editorial. Sonar humano es estilo; ocultar el método sería engañar sobre aquello que pedimos que se crea.                                    |
| Los artículos son archivos del repo, no filas de la base             | Cada cambio entra por PR con CI, y el blog no se cae cuando Supabase pausa la base.                                                                         |
| El blog se publica con la tienda                                     | Un CTA hacia «Estamos montando la tienda» quema al lector. Se escribe desde ya; sale con `TIENDA_ABIERTA`.                                                  |
| Nada de JSON-LD en los artículos                                     | El plan de la tienda midió que en páginas de contenido no mueve las citas. El esfuerzo va en la forma: respuesta corta, apartados, notas junto a cada dato. |

## 2. Cómo está hecho

| Pieza                                                               | Qué hace                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/brand/eve-origenes/`                                      | Paleta, logotipo, hojas, favicons y el manual corregido              |
| `apps/eve-store/contenido/articulos/*.md`                           | Los artículos: Markdown con cabecera YAML                            |
| `apps/eve-store/lib/articulos.ts`                                   | Los lee y los pinta; los borradores solo existen en `next dev`       |
| `apps/eve-store/app/blog/`                                          | Índice y página de artículo                                          |
| `apps/eve-store/app/politica-editorial/`                            | Cómo escribimos, contado al lector                                   |
| `apps/eve-store/scripts/temas.mjs` (`blog:temas`)                   | Catálogo publicado + qué se busca en Colombia + artículos existentes |
| `apps/eve-store/scripts/verificar-articulos.mjs` (`blog:verificar`) | Reglas de la guía, en CI                                             |
| `apps/eve-store/scripts/verificar-fuentes.mjs` (`blog:fuentes`)     | Abre cada fuente y busca la cita literal, el título y el año         |
| `.claude/skills/articulo-eve-origenes/`                             | El proceso completo, de la tendencia al PR                           |

## 3. Por qué el método protege contra errores

Ninguna revisión, humana o no, garantiza «nunca». Lo que sí se puede es que un
error tenga que atravesar cuatro filtros distintos, cada uno con una debilidad
diferente:

1. **Quien escribe** ata cada dato a una fuente que abrió y copia la frase
   literal que lo sostiene.
2. **`blog:verificar`** (mecánico, en CI) rechaza lo que se puede medir:
   extensión, estructura, fuentes insuficientes, notas sin fuente, enlaces rotos,
   CTA a suplementos, frases de IA y afirmaciones de salud prohibidas.
3. **`blog:fuentes`** (mecánico, en red) comprueba que la cita esté de verdad en
   la fuente y que **título, año y DOI** sean los de esa fuente. Lee PubMed y PMC
   por sus API oficiales, porque sus webs ya no se dejan leer por programas.
4. **Un revisor independiente** —otro agente, que no escribió el texto ni ve
   las notas de investigación— abre cada fuente y contrasta cada afirmación
   buscando exageraciones, generalizaciones y errores. Si rechaza, se corrige y
   revisa **otro agente nuevo**. Tres rechazos y el artículo no se publica.

### Lo que se comprobó al construirlo

- `blog:verificar` sobre un artículo defectuoso a propósito: cazó 13 errores y
  se le escapó uno, «Sumérgete» (la expresión esperaba la tilde en otra letra).
  Se corrigió.
- `blog:fuentes` contra PubMed: la web respondía 203 con una comprobación de
  cookies; el script marcó la fuente como no comprobable en vez de darla por
  buena, y se pasó a E-utilities.
- **El caso que justifica el paso 3:** para el artículo de prueba se escribió de
  memoria el título del estudio PMID 15724344 y resultó falso. Revista y año
  correctos, título inventado. Ahora el script lo detecta.
- Las listas de frases se calibraron contra las 24 descripciones reales de la
  tienda: ningún falso positivo. En la primera pasada se escapaban «prevenir
  infecciones» y «mejorando el sistema inmunológico» (solo reconocía algunas
  formas del verbo); se amplió.

## 4. Pendiente

- **Las fichas de producto tienen afirmaciones de salud.** Las mismas reglas,
  pasadas por las 24 descripciones publicadas, encuentran dos:
  - Aceite de Coco Orgánico (Bio Essens): «ayudando a prevenir infecciones y
    mejorando el sistema inmunológico» y «puede ayudar a la pérdida de peso».
  - Gel Hidratante Facial (Dermanat): «propiedades curativas para piel».

  Es el mismo riesgo legal que el blog evita, pero en la tienda. Hay que
  corregirlas antes de abrir.

- **Revisión legal** de dos lecturas que aquí se aplican en su versión estricta:
  si un artículo con CTA cuenta como publicidad a efectos de la Decisión 833, y
  qué se puede decir de suplementos sin aprobación del INVIMA.
- **Bio Essens** sigue con una foto de portada de 750 px.
- **Primer grupo de artículos**: el pilar del aceite de coco y sus satélites
  (ajonjolí, higuerilla, linaza, oliva), que es el ejemplo de la propia guía.
