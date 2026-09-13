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
  title: "Eve-Orígenes — en construcción",
  description: "Eve-Orígenes está en preparación.",
  robots: { index: false, follow: false }
};

export default function EnConstruccion() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="flex items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marca/logotipo-oliva.svg"
          alt="Eve-Orígenes"
          width={190}
          height={36}
          className="h-9 w-auto"
        />
      </div>

      <p className="mt-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-petroleo">
        Cuidado de la piel · Hecho en Colombia
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold leading-[1.1]">
        Estamos montando la tienda
      </h1>
      <p className="mt-5 text-base leading-relaxed text-oliva">
        Aceites naturales, cuidado facial y suplementos de marcas colombianas, con envío desde
        Bogotá. Todavía no está abierta: el catálogo está en revisión y ningún producto sale a la
        venta hasta que sus datos estén completos.
      </p>
      <p className="mt-4 text-base leading-relaxed text-oliva">
        Mientras tanto, lo demás de Evetev sigue en pie en{" "}
        <a href="https://evetev.com" className="font-medium text-oliva underline">
          evetev.com
        </a>
        .
      </p>

      <p className="mt-12 border-t border-salvia pt-6 text-sm text-oliva">
        © 2026 Evetev S.A.S. · Bogotá, Colombia
      </p>
    </main>
  );
}
