/* La búsqueda: la función más usada de una tienda y la peor atendida.
 *
 * Es un formulario GET a propósito. Así la consulta vive en la URL —se puede
 * compartir, marcar y volver atrás— y la página funciona sin JavaScript, que es
 * la condición para que un rastreador vea los resultados.
 *
 * El formulario vive ahora en `app/cabecera.tsx`, presente en todas las
 * pantallas: tenerlo sólo aquí obligaba a llegar a esta página para poder
 * buscar. Aquí se le pasa `q` para que la caja llegue rellena y se vea qué se
 * buscó.
 */
import type { Metadata } from "next";

import { Cabecera } from "@/app/cabecera";
import { Pie } from "@/app/pie";
import { buscar, pesos } from "@/lib/producto";

export const dynamic = "force-dynamic";

/* Las páginas de resultados no se indexan. Es la regla clásica y sigue
   valiendo: generan infinitas URL con contenido casi idéntico y compiten con
   las fichas, que son las que queremos que se citen. */
export const metadata: Metadata = {
  title: "Buscar · Eve-Store",
  robots: { index: false, follow: true }
};

export default async function Buscar({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const resultados = q.trim() ? await buscar(q) : [];

  return (
    <>
      <Cabecera q={q} />
      {/* El contenedor es `6xl` como la cabecera y el pie, y la lista se acota
          dentro con `3xl`. Centrando el `main` en `4xl` el título arrancaba
          ochenta píxeles más adentro que el logotipo: la página parecía otra. */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-3xl">
          {/* Un `h1` de verdad. La página no tenía ninguno: empezaba por un
            párrafo con el recuento, así que un lector de pantalla entraba a una
            pantalla sin título y quien navega por encabezados no tenía dónde
            aterrizar. Va aquí la consulta porque es de lo que trata la página. */}
          <h1 className="font-display text-2xl font-bold">
            {q.trim() ? <>Resultados para «{q}»</> : "Buscar en la tienda"}
          </h1>

          {q.trim() ? (
            <p className="mt-2 text-sm text-pizarra">
              {resultados.length === 0
                ? "No encontramos nada."
                : `${resultados.length} producto${resultados.length === 1 ? "" : "s"}.`}
            </p>
          ) : (
            <p className="mt-2 text-sm text-pizarra">
              Escribe arriba qué buscas — un producto, una marca o para qué lo quieres («piel
              grasa», «cabello»). También puedes ver{" "}
              <a href="/" className="underline">
                el catálogo completo
              </a>
              .
            </p>
          )}

          {resultados.length === 0 && q.trim() && (
            <p className="mt-2 text-sm text-pizarra">
              Prueba con menos palabras, o mira{" "}
              <a href="/" className="underline">
                el catálogo completo
              </a>
              .
            </p>
          )}

          {/* Lista y no rejilla, a propósito: en unos resultados se compara de
            arriba abajo —nombre contra nombre, precio contra precio— y una
            columna alineada hace eso mejor que una cuadrícula de fotos. */}
          <ul className="mt-8 flex flex-col gap-2">
            {resultados.map((p) => {
              const hay = p.existencias > 0;
              return (
                <li key={p.slug}>
                  <a
                    href={`/producto/${p.slug}`}
                    className="group flex items-center gap-4 rounded-xl border border-transparent p-3 transition-colors hover:border-linea hover:bg-white"
                  >
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg border border-linea bg-white">
                      {p.imagen && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.imagen} alt="" className="size-full object-contain p-1.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-pizarra">{p.marca}</p>
                      <p className="font-semibold group-hover:underline">
                        {p.nombre}
                        {p.contenido && (
                          <span className="font-normal text-pizarra"> · {p.contenido}</span>
                        )}
                      </p>
                      {/* Agotado se dice EN el resultado. Sin esto había que abrir
                        la ficha para descubrir que no se puede comprar, y la
                        búsqueda es justo donde se decide qué abrir. */}
                      {!hay && <p className="mt-0.5 text-xs font-medium text-alerta">Agotado</p>}
                    </div>
                    <p
                      className={`shrink-0 font-display font-bold tabular-nums ${
                        hay ? "" : "text-pizarra"
                      }`}
                    >
                      {pesos.format(p.precio_minor)}
                    </p>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
      <Pie />
    </>
  );
}
