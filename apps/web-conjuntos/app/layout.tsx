import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eve — Conjuntos",
  description: "Operación de propiedad horizontal, respaldada por EvePay."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
