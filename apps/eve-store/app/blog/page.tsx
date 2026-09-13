import type { Metadata } from "next";

import { Cabecera } from "@/app/cabecera";
import { Pie } from "@/app/pie";
import { articulos } from "@/lib/articulos";

/* El índice del blog. Lista lo publicado, lo más reciente primero. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog · Eve-Orígenes",
  description:
    "Cuidado de la piel y vida saludable con información contrastada: cada artículo cita sus fuentes y dice qué no se sabe."
};

export default function Blog() {
  const lista = articulos();

  return (
    <>
      <Cabecera />
      <main className="mx-auto max-w-4xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-petroleo">
          Eve-Orígenes
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-oliva sm:text-5xl">Blog</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          Cuidado de la piel y vida saludable, con cada afirmación atada a una fuente que puedes
          abrir. Cuando la evidencia es poca, lo decimos.{" "}
          <a href="/politica-editorial" className="text-petroleo underline">
            Cómo escribimos
          </a>
          .
        </p>

        {lista.length === 0 ? (
          <p className="mt-12 text-oliva">Todavía no hay artículos publicados.</p>
        ) : (
          <ul className="mt-12 flex flex-col gap-6">
            {lista.map((a) => (
              <li key={a.slug}>
                <a
                  href={`/blog/${a.slug}`}
                  className="group block rounded-2xl border border-salvia bg-white p-6 transition hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  <p className="text-xs uppercase tracking-wide text-oliva">
                    {a.temas.join(" · ")}
                    {a.estado === "borrador" && " · borrador"}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-oliva group-hover:underline">
                    {a.titulo}
                  </h2>
                  <p className="mt-2 leading-relaxed">{a.gancho}</p>
                  <p className="mt-3 text-sm text-oliva">{a.minutosLectura} min de lectura</p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Pie />
    </>
  );
}
