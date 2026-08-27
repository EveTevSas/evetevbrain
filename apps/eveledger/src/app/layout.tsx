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

const CDN = "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1";

export const metadata: Metadata = {
  title: "EveLedger — Operación diaria",
  description: "Cierre diario de estación de servicio",
  icons: {
    icon: [
      { url: `${CDN}/favicon/favicon.svg`, type: "image/svg+xml" },
      { url: `${CDN}/favicon/favicon-32.png`, sizes: "32x32", type: "image/png" }
    ],
    apple: [{ url: `${CDN}/favicon/apple-touch-icon.png` }],
    other: [{ rel: "mask-icon", url: `${CDN}/favicon/mask-icon.svg`, color: "#0A2540" }]
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
              style={{
                flex: 1,
                marginLeft: 240,
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh"
              }}
            >
              {/* Top bar */}
              <header
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
                style={{
                  flex: 1,
                  padding: "2rem 2.5rem",
                  width: "100%"
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
