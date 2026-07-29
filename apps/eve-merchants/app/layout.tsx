import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EvePay — Portal del Comercio",
  description: "Gestiona tus pagos, transacciones y configuración de EvePay."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/favicon/apple-touch-icon.png" />
        <meta name="theme-color" content="#0A2540" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
