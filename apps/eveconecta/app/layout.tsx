import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DataProvider } from "../components/data-provider";
import { ServiceWorkerRegistration } from "../components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EveConecta",
    template: "%s · EveConecta"
  },
  description: "Administración transparente y comunidad conectada para propiedad horizontal.",
  applicationName: "EveConecta",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EveConecta"
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: "#0A2540",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="es">
      <body>
        <DataProvider>{children}</DataProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
