import type { Metadata, Viewport } from "next";
import { Inter, Baloo_2 } from "next/font/google";
import "./globals.css";
import { sesionActiva } from "@/lib/auth";
import SidebarNav from "@/components/sidebar-nav";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter"
});
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-baloo"
});

/* Los activos de marca se sirven desde esta misma app (public/marca), no
   desde un CDN externo: la carpeta la llena `pnpm marca:sync` desde
   packages/brand, que es la fuente única, y el CI vigila que no se desvíe. */
const CDN = "/marca";

export const metadata: Metadata = {
  title: "EveLedger — Operación diaria",
  description: "Cierre diario de estación de servicio",
  icons: {
    icon: [
      { url: `${CDN}/favicon.svg`, type: "image/svg+xml" },
      { url: `${CDN}/favicon-32.png`, sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: `${CDN}/apple-touch-icon.png` }],
    other: [{ rel: "mask-icon", url: `${CDN}/mask-icon.svg`, color: "#0A2540" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#0A2540"
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const autenticado = await sesionActiva();

  return (
    <html lang="es" className={`${inter.variable} ${baloo.variable} h-full antialiased`}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: autenticado ? "#F5F5F5" : "#ffffff",
          fontFamily: "var(--font-sans)",
          color: "#0A2540",
          lineHeight: 1.65
        }}
      >
        {/* Sin sesión: fondo neutro lo pone el propio login (GradientBackground) */}
        {autenticado ? (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* Sidebar */}
            <SidebarNav />

            {/* Área de contenido */}
            <div
              className="eve-contenido"
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh"
              }}
            >
              {/* Top bar */}
              <header
                className="eve-topbar"
                style={{
                  height: 56,
                  background: "#fff",
                  borderBottom: "1px solid #EDF3FA",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 2rem",
                  position: "sticky",
                  top: 0,
                  zIndex: 30
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#16A34A",
                      display: "inline-block"
                    }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "#64748B" }}>En operación</span>
                </div>
              </header>

              {/* Contenido principal */}
              <main
                className="eve-main"
                style={{
                  flex: 1,
                  padding: "2rem 2.5rem",
                  width: "100%",
                  minWidth: 0
                }}
              >
                {children}
              </main>
            </div>
          </div>
        ) : (
          /* Sin sesión: el login maneja su propio layout y fondo */
          <main style={{ minHeight: "100vh" }}>{children}</main>
        )}
      </body>
    </html>
  );
}
