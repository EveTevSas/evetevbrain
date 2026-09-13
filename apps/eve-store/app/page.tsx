/* La tienda: el catálogo de lo publicado.
 *
 * Servida desde el servidor, siempre. No es preferencia: ningún rastreador de
 * IA ejecuta JavaScript, así que una tienda que dependa de hidratación es
 * invisible para ChatGPT, Perplexity y Claude por buena que sea su experiencia
 * de compra. Está medido sobre más de 500 millones de peticiones de GPTBot.
 */
import type { Metadata } from "next";

import { Cabecera } from "@/app/cabecera";
import { Jumbotron } from "@/app/jumbotron";
import { Pie } from "@/app/pie";
import { Rejilla } from "@/app/rejilla";
import { marcas, publicados } from "@/lib/producto";

/* ISR en vez de dinámico. Un catálogo no cambia entre visita y visita, y
 * servirlo desde caché tiene dos efectos que importan: la base se consulta
 * una vez por minuto en vez de una por visita, y si la regeneración falla el
 * visitante recibe la copia anterior en lugar de una página colgada. */
export const revalidate = 60;

/* El `noindex` se decide con el dato, no con la memoria de nadie.
 *
 * Con el catálogo vacío no hay nada que indexar y una tienda sin productos
 * posicionando hace más daño que no aparecer. En cuanto haya un producto
 * publicado, la restricción se levanta sola — que es justo lo que no pasó en
 * las landings, donde tres de cuatro arrastraron un `noindex` durante meses
 * porque nadie recordó quitarlo. */
export async function generateMetadata(): Promise<Metadata> {
  const hay = (await publicados()).length > 0;
  return {
    title: hay ? "Eve-Store" : "Eve-Store — próximamente",
    description:
      "Aceites naturales, cuidado facial y suplementos de marcas colombianas. Envío desde Bogotá.",
    robots: hay ? undefined : { index: false, follow: false }
  };
}

export default async function Tienda() {
  const productos = await publicados();

  /* Los nombres salen del dato, no de la memoria de nadie.
   *
   * Esta frase decía «Bio Essens, Dermanat, Botanikalia» y las tres cosas
   * estaban mal a la vez: Botanikalia no tiene nada publicado, y faltaban Allen
   * Nutrition e Ilovepinch. Con la fila de filtros justo debajo, la copia se
   * contradecía con la propia pantalla. Escrita a mano, esta lista vuelve a
   * mentir en cuanto entre o salga una marca. */
  const nombres = (await marcas()).map((m) => m.marca);
  const listaDeMarcas =
    nombres.length > 1
      ? `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`
      : (nombres[0] ?? "");

  if (productos.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">Eve-Store</p>
        <h1 className="mt-1 font-display text-3xl font-bold">Todavía no hay tienda</h1>
        <p className="mt-3 text-sm leading-relaxed text-pizarra">
          El catálogo está cargado y en revisión: ningún producto sale a la venta hasta que sus
          datos estén completos. Mientras tanto, el panel de administración vive en{" "}
          <a href="/panel" className="underline">
            /panel
          </a>
          .
        </p>
      </main>
    );
  }

  return (
    <>
      <Cabecera />

      {/* La foto tiene el bodegón abajo a la izquierda y aire a la derecha, así
          que el texto va ahí. En móvil el encuadre baja y se va al centro: con
          la columna estrecha, `35%` dejaba la bandeja fuera. */}
      <Jumbotron
        imagen="/marca/spa-still-life.webp"
        encuadre="object-[40%_70%] sm:object-[35%_65%]"
        lado="derecha"
        tono="oscuro"
      >
        {/* Cian y no teal: sobre azul noche, el cian es el realce que el manual
            da por contrastado. El teal identifica la línea Tienda en fondo
            claro, que es donde se lee. */}
        <p className="text-xs font-semibold uppercase tracking-widest text-cian">Tienda Evetev</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.1] sm:text-5xl">
          Aceites naturales y cuidado de la piel
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-hielo">
          Marcas colombianas: {listaDeMarcas}. Cada ficha lleva el precio, el contenido y las
          unidades que hay hoy — si dice que hay, hay.
        </p>

        {/* Las cifras salen del catálogo. Escritas a mano mienten en cuanto entre
            o salga un producto, que es el mismo error ya corregido en la lista de
            marcas de arriba. */}
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          <Cifra n={productos.length} que={productos.length === 1 ? "producto" : "productos"} />
          <Cifra n={nombres.length} que={nombres.length === 1 ? "marca" : "marcas"} />
          <Cifra n={productos.filter((p) => p.existencias > 0).length} que="con existencias hoy" />
        </dl>
      </Jumbotron>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="font-display text-2xl font-bold">Todo el catálogo</h2>
        <Rejilla productos={productos} nivel={3} />
      </main>
      <Pie />
    </>
  );
}

/* Una cifra y lo que cuenta. Baloo 700 para el número, que es la regla de la
 * marca para cualquier monto o cantidad destacada. */
function Cifra({ n, que }: { n: number; que: string }) {
  return (
    <div>
      <dt className="sr-only">{que}</dt>
      <dd>
        <span className="font-display text-3xl font-bold tabular-nums">{n}</span>
        <span className="ml-2 text-sm opacity-80">{que}</span>
      </dd>
    </div>
  );
}
