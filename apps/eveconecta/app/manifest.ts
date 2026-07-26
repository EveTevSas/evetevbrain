import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EveConecta",
    short_name: "EveConecta",
    description: "Operación confiable de propiedad horizontal.",
    start_url: "/",
    display: "standalone",
    background_color: "#FDFEFF",
    theme_color: "#0A2540",
    lang: "es-CO",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
