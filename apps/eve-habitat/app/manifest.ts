import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eve-Habitat",
    short_name: "Eve-Habitat",
    description: "Operación confiable de propiedad horizontal.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f3",
    theme_color: "#087e78",
    lang: "es-CO",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
