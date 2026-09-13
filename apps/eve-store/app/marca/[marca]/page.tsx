/* Una página por marca.
 *
 * Es la alternativa a `?marca=` sobre la portada, y la diferencia no es
 * estética: un parámetro habría vuelto dinámica la portada —adiós al ISR— y
 * habría dejado el filtro como puro estado de la interfaz. Así cada marca es
 * una página prerenderizada, con su título, su descripción y su URL: se
 * comparte, se enlaza y se puede citar. Lo que no es enlazable no aparece en
 * ninguna respuesta de IA.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Cabecera } from "@/app/cabecera";
import { Jumbotron } from "@/app/jumbotron";
import { Pie } from "@/app/pie";
import { Rejilla } from "@/app/rejilla";
import { marcas, porMarca, slugDeMarca } from "@/lib/producto";
import { urlBase } from "@/lib/url";

export const revalidate = 60;

/* Las marcas que tienen banner propio, y cómo se encuadra el suyo.
 *
 * Es un registro y no una convención de nombres (`/marca/<slug>.webp`) a
 * propósito: una ruta adivinada responde 404 en silencio el día que falta el
 * archivo, y aquí lo que falta es que la marca no salga en este objeto — que se
 * ve leyéndolo. Las marcas sin entrada no reciben una imagen inventada: se
 * quedan con la banda blanca de abajo.
 *
 * Cada banner es de su marca, no nuestro, y por eso el tono va con la foto. El
 * de Dermanat es gris cálido y editorial: el velo oscuro del manual lo ensucia
 * y le cambia el carácter, así que lleva velo claro con el texto en azul noche
 * (~14:1 sobre ese fondo). El motivo —la modelo con el frasco— está a la
 * derecha, así que el texto va a la izquierda.
 *
 * **La foto tiene que ser una foto.** Allen e Ilovepinch llegaron primero como
 * anuncios ya maquetados, con su titular y sus claims dentro de la imagen, y
 * detrás de nuestro `h1` eso no se arregla moviendo el texto: nuestro «Allen
 * Nutrition» caía sobre su «RESULTADOS», y `object-cover` partía su titular por
 * un sitio distinto en cada ancho de pantalla. Si vuelve a llegar una pieza
 * así, no va aquí: se enseña entera, sin recorte ni velo, y nuestro titular va
 * en su propia banda encima.
 *
 * Añadir una marca son dos pasos: publicar la imagen con
 * `node scripts/marca-imagen.mjs <archivo> --app eve-store`, que la convierte a
 * WebP y la apunta en el manifiesto, y una línea aquí. Sin lo primero, la ruta
 * existe en el repo y no la sirve nadie.
 */
type Portada = {
  imagen: string;
  encuadre: string;
  lado: "izquierda" | "derecha";
  tono: "oscuro" | "claro";
  columna?: string;
};

const PORTADAS: Record<string, Portada> = {
  dermanat: {
    imagen: "/marca/dermanat-pic.webp",
    /* La fuente es 3:1. En móvil, recortada a una banda casi cuadrada, se
       pierde el 60% del ancho: anclada a la derecha se ve la modelo y algo de
       fondo; centrada no se vería más que gris. */
    encuadre: "object-right sm:object-center",
    lado: "izquierda",
    tono: "claro"
  },
  "bio-essens": {
    /* Ésta sí es una foto de producto, sin tipografía metida dentro: el frasco
       a la izquierda y el coco detrás del texto, a la derecha. */
    imagen: "/marca/bioessens-pic.webp",
    encuadre: "object-left",
    lado: "derecha",
    tono: "claro"
  },
  "allen-nutrition": {
    /* Gimnasio a contraluz: el fondo es claro y muy movido —pesas, ventanales—
       así que el texto sólo se sostiene con velo oscuro. El modelo y la bolsa
       ocupan del centro a la derecha, de modo que el texto va a la izquierda. */
    imagen: "/marca/allen-pic.webp",
    /* Anclada arriba en escritorio, y no centrada.
     *
     * La banda es mucho más ancha que 16:9, así que `cover` escala por el ancho
     * y recorta por arriba y por abajo: centrada se comía la cabeza del modelo y
     * lo dejaba cortado por las cejas. Anclada al tope, la cara entra entera y
     * lo que se pierde es el fondo de la bolsa, que ya se entiende sin ver el
     * borde de abajo.
     *
     * En móvil se queda centrada porque ahí no aplica: la banda es más alta que
     * ancha, `cover` escala por el alto y el recorte pasa a ser HORIZONTAL — la
     * componente vertical de `object-position` no hace nada. */
    encuadre: "object-center sm:object-top",
    lado: "izquierda",
    tono: "oscuro"
  },
  ilovepinch: {
    /* Modelo a la izquierda, producto al centro, y a la derecha un fondo crema
       con sombras suaves: ahí cabe el texto sin tapar nada. */
    imagen: "/marca/ilovepinch-pic.webp",
    /* Anclada arriba en escritorio, por lo mismo que la de Allen: la banda es
       más ancha que la foto, `cover` recorta por arriba y por abajo, y centrada
       le cortaba la cabeza a la modelo. Y de paso resuelve lo otro — arriba a la
       derecha la pared está despejada, así que el texto deja de caer encima del
       labial. */
    encuadre: "object-left sm:object-top",
    lado: "derecha",
    tono: "claro",
    /* Más estrecha que media banda: el hueco crema empieza pasado el 70% de la
       foto, y con la mitad el titular caía justo encima del labial. */
    columna: "sm:w-[38%]"
  }
};

export async function generateStaticParams() {
  return (await marcas()).map(({ marca }) => ({ marca: slugDeMarca(marca) }));
}

/* Del slug al nombre, recorriendo las marcas que existen.
 *
 * Nunca al revés: deshacer un slug obliga a adivinar los espacios y los
 * acentos, y «bio-essens» tanto podría ser «Bio Essens» como «Bio-Essens».
 * Comparando en un solo sentido no hay nada que adivinar. */
async function resolver(slug: string) {
  return (await marcas()).find((m) => slugDeMarca(m.marca) === slug) ?? null;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ marca: string }>;
}): Promise<Metadata> {
  const encontrada = await resolver((await params).marca);
  if (!encontrada) return {};

  const { marca, cuantos } = encontrada;
  return {
    title: `${marca} — ${cuantos} producto${cuantos === 1 ? "" : "s"} · Eve-Store`,
    description: `Todo lo de ${marca} que tenemos en existencia: ${cuantos} producto${
      cuantos === 1 ? "" : "s"
    } con precio y unidades reales. Envío desde Bogotá.`,
    alternates: { canonical: `${urlBase()}/marca/${slugDeMarca(marca)}` }
  };
}

export default async function PaginaMarca({ params }: { params: Promise<{ marca: string }> }) {
  const encontrada = await resolver((await params).marca);
  if (!encontrada) notFound();

  const { marca, cuantos } = encontrada;
  const productos = await porMarca(marca);
  const portada = PORTADAS[slugDeMarca(marca)];

  return (
    <>
      {/* `marcaActiva` enciende esta marca en la navegación de la cabecera, que
          es donde vive desde que el filtro dejó de estar en el cuerpo: así se
          ve en qué parte del catálogo está uno sin tener que leer el titular. */}
      <Cabecera marcaActiva={marca} />

      {/* El mismo titular en las dos variantes, escrito una vez. Copiado, la
          corrección de contraste de abajo se habría aplicado a una y no a la
          otra — que es exactamente cómo divergen dos bloques gemelos. */}
      {portada ? (
        <Jumbotron
          {...portada}
          alto="min-h-[20rem] sm:min-h-[26rem] lg:min-h-[30rem] xl:min-h-[34rem]"
        >
          <Titular marca={marca} cuantos={cuantos} fondo={portada.tono} />
        </Jumbotron>
      ) : (
        <div className="border-b border-linea bg-white">
          <header className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
            <Titular marca={marca} cuantos={cuantos} />
          </header>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 py-12">
        <Rejilla productos={productos} />
      </main>
      <Pie />
    </>
  );
}

/* El titular, con los colores que pida el fondo donde cae.
 *
 * Son tres fondos y no dos, y saltárselo rompe el contraste en silencio:
 *
 *   · Banda blanca — `pizarra` para la entradilla. Es para lo que está hecho:
 *     4,7:1 sobre blanco puro, que pasa AA por poco.
 *   · Velo claro — el fondo ya no es blanco, es blanco al 80-95% sobre una foto
 *     gris, y ahí `pizarra` cae a ~3,7:1. Va en azul noche.
 *   · Velo oscuro — ninguno de los dos sirve: `pizarra` sobre azul noche es
 *     ilegible. Van hielo y cian, que es el realce que el manual da por
 *     contrastado sobre fondo oscuro.
 *
 * La jerarquía no la sostiene el color sino el tamaño y el peso del `h1`, que
 * para eso están. */
function Titular({
  marca,
  cuantos,
  fondo = "banda"
}: {
  marca: string;
  cuantos: number;
  fondo?: "banda" | "claro" | "oscuro";
}) {
  const antetitulo = fondo === "oscuro" ? "text-cian" : "text-teal";
  const entradilla =
    fondo === "oscuro" ? "text-hielo" : fondo === "claro" ? "text-noche" : "text-pizarra";

  return (
    <>
      <p className={`text-xs font-semibold uppercase tracking-widest ${antetitulo}`}>Marca</p>
      <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">{marca}</h1>
      <p className={`mt-4 max-w-xl text-base leading-relaxed ${entradilla}`}>
        {cuantos} producto{cuantos === 1 ? "" : "s"} de {marca}, con existencias reales — si dice
        que hay, hay. Envío desde Bogotá.
      </p>
    </>
  );
}
