import type { Metadata } from "next";

import "./globals.css";

/* El `noindex` global ESTUVO aquí, y ese día llegó.
 *
 * Se puso cuando la tienda no existía y todo lo que había era el panel. El
 * propio comentario avisaba de que, en cuanto la tienda ocupara la raíz, había
 * que bajarlo al layout de `/panel` — y no se hizo. Resultado: con veinticuatro
 * productos publicados, las fichas emitían `noindex, nofollow`. Las páginas que
 * queremos que se citen eran justo las invisibles.
 *
 * Es el mismo fallo que auditamos en las landings en agosto, donde tres de
 * cuatro arrastraron un `noindex` durante meses porque nadie se acordó de
 * quitarlo, y es la palanca que de verdad decide si apareces en una respuesta
 * de IA: el acceso, no el marcado.
 *
 * Ahora cada zona declara lo suyo — `/panel`, `/entrar` y `/sin-acceso` se
 * excluyen en su propio layout o página, y el carrito, el checkout y la
 * búsqueda ya lo hacían. */
export const metadata: Metadata = { title: "Eve-Store" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-[Inter,system-ui,sans-serif] antialiased">{children}</body>
    </html>
  );
}
