/* La tienda: el catálogo de lo publicado.
 *
 * Servida desde el servidor, siempre. No es preferencia: ningún rastreador de
 * IA ejecuta JavaScript, así que una tienda que dependa de hidratación es
 * invisible para ChatGPT, Perplexity y Claude por buena que sea su experiencia
 * de compra. Está medido sobre más de 500 millones de peticiones de GPTBot.
 */
import type { Metadata } from "next";

import { Cabecera } from "@/app/cabecera";
import { FiltroMarcas } from "@/app/filtro-marcas";
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
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="border-b border-linea pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">Eve-Store</p>
          <h1 className="mt-1 font-display text-4xl font-bold">
            Aceites naturales y cuidado de la piel
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-pizarra">
            Marcas colombianas: {listaDeMarcas}. {productos.length} productos, con existencias
            reales — si dice que hay, hay.
          </p>
          <FiltroMarcas />
        </header>

        <Rejilla productos={productos} />
      </main>
      <Pie />
    </>
  );
}
