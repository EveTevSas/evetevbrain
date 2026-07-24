import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DataProvider } from "../components/data-provider";
import { ServiceWorkerRegistration } from "../components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Eve-Habitat",
    template: "%s · Eve-Habitat"
  },
  description: "Administración transparente y comunidad conectada para propiedad horizontal.",
  applicationName: "Eve-Habitat",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Eve-Habitat"
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: "#087e78",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <DataProvider>{children}</DataProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
