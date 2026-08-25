import type { NextConfig } from "next";

const config: NextConfig = {
  // Las imágenes del catálogo son las de Mercado Libre mientras no tengamos las
  // propias. Es deuda declarada: al abrir la tienda hay que servirlas nosotros.
  images: { remotePatterns: [{ protocol: "https", hostname: "http2.mlstatic.com" }] },

  /* Cuántos procesos prerenderizan a la vez.
   *
   * Se fija a mano porque el valor por defecto son los núcleos de la máquina, y
   * eso multiplica las conexiones a la base: Next arranca UN PROCESO por worker
   * y cada uno abre su propio pool. En una máquina de diez núcleos son nueve
   * pools contra un pooler que admite quince clientes — el build se cayó con
   * `max clients reached in session mode`.
   *
   * En Vercel pasaba por poco (dos núcleos), así que el fallo estaba ahí
   * esperando a que la máquina de compilación fuera mayor. Con este tope y el
   * `max` de `db/connection.ts`, el techo son 2 × 3 = 6 conexiones de las quince del pooler, venga de
   * donde venga el build, y quedan nueve libres para la tienda en producción y
   * para EveConecta, que comparten el mismo pooler. */
  experimental: { cpus: 2 }
};

export default config;
