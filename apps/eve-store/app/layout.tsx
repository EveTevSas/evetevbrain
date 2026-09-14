import type { Metadata } from "next";
import { Caveat, Didact_Gothic, El_Messiri } from "next/font/google";

import "./globals.css";

/* Las tipografías de Eve-Orígenes, en su versión de licencia libre.
 *
 * `next/font` las descarga al compilar y las sirve desde este dominio: ninguna
 * visita hace una petición a Google. Antes se cargaban con un `<link>` a
 * fonts.googleapis.com, que además de un viaje de red más le contaba a Google
 * quién visitaba la tienda. Cada una publica una variable CSS que `globals.css`
 * convierte en `font-display`, `font-sans` y `font-acento`. */
const titulos = El_Messiri({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--fuente-titulos"
});
const texto = Didact_Gothic({ subsets: ["latin"], weight: "400", variable: "--fuente-texto" });
const acento = Caveat({ subsets: ["latin"], weight: ["400", "600"], variable: "--fuente-acento" });

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
/* El favicon es la hoja en círculo del manual de Eve-Orígenes —la que su
 * logotipo usa como «O»—, extraída del PDF y servida desde `/marca` como el
 * resto de la marca. */
export const metadata: Metadata = {
  title: "Eve-Orígenes",
  icons: {
    icon: [
      { url: "/marca/favicon.svg", type: "image/svg+xml" },
      { url: "/marca/favicon-32.png", sizes: "32x32", type: "image/png" }
    ],
    apple: "/marca/apple-touch-icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${titulos.variable} ${texto.variable} ${acento.variable}`}>
      <head>
        {/* La paleta de marca, antes que cualquier pintado: sin ella las
            utilidades de color apuntan a variables vacías. */}
        <link rel="stylesheet" href="/marca/colores.css" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
