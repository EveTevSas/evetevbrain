import type { NextConfig } from "next";

const config: NextConfig = {
  // Las imágenes del catálogo son las de Mercado Libre mientras no tengamos las
  // propias. Es deuda declarada: al abrir la tienda hay que servirlas nosotros.
  images: { remotePatterns: [{ protocol: "https", hostname: "http2.mlstatic.com" }] }
};

export default config;
