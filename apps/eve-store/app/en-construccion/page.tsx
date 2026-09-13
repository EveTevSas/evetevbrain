import type { Metadata } from "next";

/* El letrero de «en construcción».
 *
 * Es la única pantalla pública mientras `TIENDA_ABIERTA` no esté puesta. La
 * reescritura vive en el middleware, no aquí: si cada página tuviera que
 * acordarse de comprobar la bandera, la página nueva que alguien añada dentro de
 * tres meses se saltaría la puerta sin que nada fallara. Un solo sitio por el
 * que pasa todo.
 *
 * El `noindex, nofollow` va en la propia pantalla y no sólo en el robots.txt
 * porque son dos señales para dos situaciones distintas: el robots pide que no
 * se rastree, y esto le dice a quien rastree igual —que los hay— que no lo
 * guarde.
 */
export const metadata: Metadata = {
  title: "Eve-Store — en construcción",
  description: "La tienda de Evetev está en preparación.",
  robots: { index: false, follow: false }
};

export default function EnConstruccion() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/marca/isotipo-azul-noche.svg" alt="" width={30} height={30} />
        <span className="font-display text-xl font-bold">Eve-Store</span>
      </div>

      <p className="mt-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal">
        <span aria-hidden="true" className="unidad-teal size-4" />
        Tienda Evetev
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold leading-[1.1]">
        Estamos montando la tienda
      </h1>
      <p className="mt-5 text-base leading-relaxed text-pizarra">
        Aceites naturales, cuidado facial y suplementos de marcas colombianas, con envío desde
        Bogotá. Todavía no está abierta: el catálogo está en revisión y ningún producto sale a la
        venta hasta que sus datos estén completos.
      </p>
      <p className="mt-4 text-base leading-relaxed text-pizarra">
        Mientras tanto, lo demás de Evetev sigue en pie en{" "}
        <a href="https://evetev.com" className="font-medium text-noche underline">
          evetev.com
        </a>
        .
      </p>

      <p className="mt-12 border-t border-linea pt-6 text-sm text-pizarra">
        © 2026 Evetev S.A.S. · Bogotá, Colombia
      </p>
    </main>
  );
}
