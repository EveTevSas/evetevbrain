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
import { FiltroMarcas } from "@/app/filtro-marcas";
import { Pie } from "@/app/pie";
import { Rejilla } from "@/app/rejilla";
import { marcas, porMarca, slugDeMarca } from "@/lib/producto";
import { urlBase } from "@/lib/url";

export const revalidate = 60;

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

  return (
    <>
      <Cabecera />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="border-b border-linea pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">Marca</p>
          <h1 className="mt-1 font-display text-4xl font-bold">{marca}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-pizarra">
            {cuantos} producto{cuantos === 1 ? "" : "s"} de {marca}, con existencias reales — si
            dice que hay, hay. Envío desde Bogotá.
          </p>
          <FiltroMarcas activa={marca} />
        </header>

        <Rejilla productos={productos} />
      </main>
      <Pie />
    </>
  );
}
