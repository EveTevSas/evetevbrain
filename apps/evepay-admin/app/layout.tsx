import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "EvePay Admin",
  description: "Consola de administración de EvePay — uso exclusivo de Evetev.",
  icons: { icon: "/marca/favicon.svg" },
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
          background: "#F5F5F5",
          color: "#0A2540"
        }}
      >
        {children}
      </body>
    </html>
  );
}
