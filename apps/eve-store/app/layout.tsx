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
/* El favicon y el isotipo salen de `/marca`, servido por esta misma app.
 *
 * Eve-Store era la única app del repo sin marca propia: pestaña con el icono
 * por defecto del navegador y la palabra «Eve-Store» en texto plano por todo
 * logotipo. No hay CDN de marca —el repo que lo servía se borró—, así que cada
 * app copia lo suyo con `pnpm marca:sync` y lo sirve desde su propio origen. */
export const metadata: Metadata = {
  title: "Eve-Store",
  icons: {
    icon: [
      { url: "/marca/favicon.svg", type: "image/svg+xml" },
      { url: "/marca/favicon-32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: "/marca/apple-touch-icon.png",
    other: [{ rel: "mask-icon", url: "/marca/mask-icon.svg", color: "#0a2540" }]
  }
};

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
