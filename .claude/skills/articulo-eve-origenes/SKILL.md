---
name: articulo-eve-origenes
description: Escribe, verifica y publica un artículo del blog de Eve-Orígenes (apps/eve-store/contenido/articulos/) siguiendo la guía de redacción — tema en tendencia en Colombia, al menos 3 fuentes abiertas y citadas literalmente, 1000–2000 palabras con voz humana, CTA a productos de la tienda solo donde la evidencia respalda el uso — y lo somete a una ronda de revisión independiente y acotada que bloquea la publicación si deja al lector con una idea falsa o incumple una norma. Usar cuando se pida un artículo, entrada o contenido para el blog de Eve-Orígenes, o revisar artículos ya publicados.
---

# Artículo para Eve-Orígenes

Los artículos los escribe la IA. **La regla que no se negocia: nunca se publica
información incorrecta.** No hay garantía humana de lectura, así que la garantía
es el método: cada afirmación atada a una fuente abierta, dos verificadores
mecánicos y una ronda de un revisor independiente que no escribió el texto. Si algo no se
sostiene, se quita. Si no se puede quitar sin romper el artículo, no se publica.

Ante la duda entre publicar algo dudoso y no publicar, **no se publica**.

## Antes de empezar, leer

- `guia.md` — la guía de redacción de Eve-Orígenes, con las decisiones tomadas.
- `escritura.md` — la voz y lo que delata a una IA.
- `fuentes-y-normas.md` — qué fuente vale, cómo se cita, y qué no se puede afirmar.
- `plantilla.md` — el formato del archivo.
- `verificacion.md` — el encargo del revisor final. **Leerlo, no ejecutarlo tú**:
  lo ejecuta otro agente.

Todos los comandos, desde la raíz del repo, con `pnpm --filter @evetev/eve-store`.

## 1. Tema

1. `blog:temas` — catálogo publicado, qué se busca en Colombia alrededor de cada
   ingrediente y los artículos que ya existen. Con semillas propias:
   `blog:temas "piel seca" "protector solar"`.
2. Completar la tendencia con lo que el script no ve: Google Trends para Colombia
   y noticias del momento (clima, temporada, avances publicados). Anotar de dónde
   sale que el tema es actual.
3. Delimitar: de «piel seca» a «piel seca en clima frío de altura». Mirar los
   pisos térmicos, las edades y los hábitos (ver `guia.md`).
4. **Comprobar que no exista ya** un artículo sobre lo mismo. Si existe, el
   trabajo es ampliarlo o enlazarlo, no duplicarlo.
5. Decidir a qué productos podría llevar — **provisionalmente**: el paso 2 puede
   quitarlos. Nunca suplementos (ver `fuentes-y-normas.md`).
6. Lista de palabras clave de las sugerencias, para usarlas con naturalidad.

## 2. Investigación

1. Buscar fuentes siguiendo la jerarquía de `fuentes-y-normas.md`. Preferir
   PubMed y PMC a la web de la revista: `blog:fuentes` los lee por su API y
   comprueba además título y año. Para buscar, E-utilities (`esearch.fcgi`).
2. **Abrir cada fuente y leer el texto crudo.** Una fuente que no se ha abierto
   no existe. Nada de citar de memoria, ni un título «que suena», ni un DOI que
   no se ha seguido — al construir la skill, un título escrito de memoria para
   una prueba resultó falso. La cita literal se copia del texto que devuelve
   `curl`, no de WebFetch, que resume con otro modelo y puede parafrasear. La
   web de PubMed no se deja leer por programas: usar E-utilities
   (`efetch.fcgi?db=pubmed&id=<PMID>&rettype=abstract&retmode=text`), sin pasar
   de tres peticiones por segundo.
3. De cada fuente copiar **la frase literal** que sostiene lo que se va a decir.
   Si la idea no está en una frase copiable, esa fuente no sostiene esa idea.
4. Hacer la tabla de afirmaciones: cada dato del futuro artículo → fuente → cita.
5. **Aquí se decide el enfoque, no antes.** Si la evidencia no respalda el uso
   que se quería contar, el artículo cuenta eso. Si no respalda el uso de un
   producto, ese producto no lleva CTA. Si el tema no da para 1000 palabras
   honestas, se cambia de tema.

## 3. Redacción

Crear `apps/eve-store/contenido/articulos/<slug>.md` desde `plantilla.md`, con
`estado: borrador`.

- Estructura de la guía: título, gancho, introducción, desarrollo, conclusiones.
  Las referencias NO se escriben en el cuerpo: salen de la cabecera.
- 1000–2000 palabras de prosa. Tuteo. Español de Colombia.
- `[n]` detrás de cada frase con un dato; `n` es el id de la fuente.
- Enlaces internos a otros artículos (`/blog/…`) y a la tienda (`/producto/…`,
  `/marca/…`) donde vengan a cuento, como pide el paso 4 de la guía.
- `::producto[slug]` sola en una línea donde encaje un CTA: 1 a 3 por artículo,
  y solo tras un párrafo cuya evidencia respalde ese uso.
- La respuesta corta arriba: lo que hay que saber en 15–80 palabras, sin
  exagerar nada que el cuerpo matice.

## 4. Pulido propio

Releer entero contra `escritura.md` —las señales de IA, una por una— y corregir
ortografía, ritmo, redundancias y coherencia. Leerlo en voz alta, por así
decirlo: si una frase no la diría una persona, se reescribe.

Levantar la tienda en local y mirar el artículo pintado en `/blog/<slug>` (los
borradores solo se ven en `next dev`).

## 5. Verificación mecánica

```bash
pnpm --filter @evetev/eve-store blog:verificar <slug>
pnpm --filter @evetev/eve-store blog:fuentes <slug>
```

- `blog:verificar` tiene que salir sin errores. Los avisos (·) se revisan uno a
  uno y se corrigen o se justifican al revisor.
- `blog:fuentes` tiene que salir sin ✗. Una cita «no literal» se copia exacta;
  una fuente «rota» se sustituye. Las «?» (bloqueo, PDF) quedan para el revisor.

## 6. Revisión independiente

Lanzar **un agente nuevo** (herramienta Agent, tipo `general-purpose`) con el
encargo de `verificacion.md`, pasándole **solo la ruta del artículo**. Nada de
las notas de investigación ni de esta conversación: tiene que llegar sin saber
qué se quería decir, para leer lo que efectivamente se dice.

Es **una ronda, acotada**. Lo exhaustivo lo hacen los pasos 2 a 5; el revisor
busca lo que deja al lector con una idea falsa o crea un problema legal. No es
una revisión por pares: el primer artículo pasó tres rondas de unos 120.000
tokens cada una cazando matices, y así no escala.

Con su veredicto:

- **Aprobado** → corregir los menores que se arreglen en un minuto, y al paso 7.
- **Corregir** → aplicar cada corrección **quitando o matizando**. Cambiar de
  fuente solo vale si la nueva dice exactamente eso; si hay que buscar mucho para
  salvar una frase, la frase sobra. **Corregir no es añadir**: en el primer
  artículo, cada ronda tumbó una frase escrita al arreglar la anterior («dos
  avisos», luego «tres avisos»; la página tenía cuatro). Lo que entre nuevo se
  comprueba contra la fuente, o no entra. Repetir el paso 5 y seguir al 7, **sin
  otra ronda**.
- **Rechazado** → rehacer lo que no se sostiene y hacer **una segunda y última
  ronda** con otro agente nuevo. Si vuelve rechazado, el artículo queda en
  `borrador` y se informa qué no se consiguió sostener.

## 7. Publicación

1. En la cabecera: `estado: publicado` y el bloque `verificacion` con lo que
   devolvió el revisor (`estado: aprobado`, también tras un «corregir» ya
   aplicado; `fecha`, `afirmaciones`, `fuentes_abiertas`).
2. `blog:verificar <slug>` otra vez: con `publicado` comprueba el bloque.
3. Comprobar contra la tienda en marcha que cada producto de `productos` sigue
   publicado (la tarjeta de un producto retirado no se pinta, y el CTA se pierde).
4. Rama `contenido/<slug>`, `pnpm format`, commit con Conventional Commits
   (`feat(eve-origenes): artículo «<título>»`), push y PR. En la descripción del
   PR, el veredicto del revisor y la salida de los dos verificadores.
5. Mezclar **solo si el usuario lo ha pedido** en la conversación. El CI corre
   `blog:verificar` sobre todos los artículos.

El blog se publica con la tienda: mientras `TIENDA_ABIERTA` no esté puesta en
producción, un artículo mezclado existe en el repo y en las vistas previas, pero
no en la web pública.

## Revisar lo publicado

Las fuentes se pudren y la ciencia se actualiza. Cuando se pida revisar:

1. `blog:fuentes <slug>` sobre cada artículo publicado.
2. Si una fuente se rompió o cambió, rehacer los pasos 2, 5 y 6 para las
   afirmaciones que sostenía, actualizar `revisado_en` y abrir PR.
3. Si una afirmación ya no se sostiene y no hay forma honesta de arreglarla, el
   artículo vuelve a `borrador` hasta que se rehaga. Un artículo retirado es un
   problema pequeño; uno equivocado y publicado, no.
