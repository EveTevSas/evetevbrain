import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Eve-Store",
  /* Nada se indexa todavía: la tienda no existe y el panel es una herramienta
     interna. El día que la tienda ocupe la raíz, este `noindex` tiene que
     bajar al layout de `/panel` — dejarlo aquí haría invisible la tienda, que
     es justo el fallo que auditamos en las landings en agosto. */
  robots: { index: false, follow: false }
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
