import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Baloo_2 } from "next/font/google";
import "./globals.css";
import { sesionActiva } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

// Tipografía de marca (§3): Inter para toda la UI, Baloo 2 para titulares y cifras.
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
  // Favicons del CDN de marca (§4). Nunca dibujar el logo a mano (T1).
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

const enlaces = [
  { href: "/", texto: "Cierres" },
  { href: "/inventarios", texto: "Inventarios" },
  { href: "/cartera", texto: "Cartera" },
  { href: "/financiero", texto: "Financiero" },
  { href: "/dashboard", texto: "Dashboard" },
  { href: "/consolidado", texto: "Consolidado" },
  { href: "/config", texto: "Configuración" }
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const autenticado = await sesionActiva();
  return (
    <html lang="es" className={`${inter.variable} ${baloo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-eve-blanco font-sans text-eve-azul-noche">
        {autenticado && (
          /* Nav sticky con blur y borde inferior línea (§6) */
          <header className="sticky top-0 z-50 border-b border-eve-linea bg-eve-blanco/95 backdrop-blur-[8px]">
            <div className="mx-auto flex h-[60px] max-w-[1040px] items-center justify-between px-[clamp(24px,4.5vw,32px)]">
              {/* Logo: isotipo del CDN + nombre del producto en Baloo 2 600 (§4) */}
              <Link href="/" aria-label="EveLedger inicio" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${CDN}/isotipos/isotipo-azul-noche.svg`} alt="" width={32} height={23} />
                <span className="brand text-lg leading-none">EveLedger</span>
                <span className="hidden text-xs text-eve-pizarra sm:inline">por Evetev</span>
              </Link>

              {/* Menú escritorio */}
              <nav className="hidden items-center gap-[26px] text-[0.85rem] text-eve-pizarra md:flex">
                {enlaces.map((e) => (
                  <Link
                    key={e.href}
                    href={e.href}
                    className="transition-colors duration-150 hover:text-eve-azul-noche"
                  >
                    {e.texto}
                  </Link>
                ))}
                <form action={logout}>
                  <button type="submit" className="btn btn-ghost !min-h-[36px] !px-4 !py-1.5">
                    Salir
                  </button>
                </form>
              </nav>

              {/* Menú móvil (≤760px): hamburguesa 3 líneas 20×2px con panel desplegable */}
              <details className="group relative md:hidden">
                <summary
                  aria-label="Abrir menú"
                  className="flex h-11 w-11 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-[9px] [&::-webkit-details-marker]:hidden"
                >
                  <span className="block h-[2px] w-5 rounded bg-eve-azul-noche" />
                  <span className="block h-[2px] w-5 rounded bg-eve-azul-noche" />
                  <span className="block h-[2px] w-5 rounded bg-eve-azul-noche" />
                </summary>
                <nav className="card absolute right-0 top-full mt-2 flex w-48 flex-col gap-1 p-2 text-[0.85rem]">
                  {enlaces.map((e) => (
                    <Link
                      key={e.href}
                      href={e.href}
                      className="rounded-[9px] px-3 py-2.5 text-eve-azul-noche hover:bg-eve-tinte"
                    >
                      {e.texto}
                    </Link>
                  ))}
                  <form action={logout}>
                    <button type="submit" className="btn btn-ghost mt-1 w-full !min-h-[44px]">
                      Salir
                    </button>
                  </form>
                </nav>
              </details>
            </div>
          </header>
        )}
        {/* Ancho de contenido máx. 1040px, padding fluido (§5) */}
        <main className="mx-auto w-full max-w-[1040px] flex-1 px-[clamp(24px,4.5vw,32px)] py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
