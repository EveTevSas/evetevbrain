import "server-only";

import type { Publico } from "@/lib/producto";

/* El catálogo de mentira, para trabajar la tienda sin base de datos.
 *
 * POR QUÉ EXISTE. Sin base, `next dev` y `next build` se caen en la primera
 * consulta y no hay ninguna pantalla que mirar: ni portada, ni ficha, ni
 * búsqueda. Eso convierte cualquier trabajo de diseño en escribir a ciegas y
 * esperar al despliegue, que es justo lo que esta casa no hace. Con el fixture
 * la tienda se pinta entera con los veinticinco productos que ya están en el
 * repo.
 *
 * NO ES UN RESPALDO. No se activa solo, no salta cuando la base falla y no
 * tiene nada que ver con la resiliencia. Hay que pedirlo a mano:
 *
 *     TIENDA_FIXTURE=1 pnpm --filter @evetev/eve-store dev
 *
 * Que sea explícito es la mitad del diseño. Un respaldo automático haría que
 * una base caída se viera igual que una base sana, y en una tienda eso
 * significa vender lo que no hay: exactamente el fallo que el schema previene
 * con un disparador en vez de con una validación de aplicación.
 *
 * Y POR ESO EL FRENO DE ABAJO. La variable puesta en Vercel serviría un
 * catálogo inventado a clientes reales, con precios y existencias que no
 * existen. No basta con documentar que no se haga: se rompe el arranque.
 */

/* En producción no, y no se discute con una variable de entorno.
 *
 * `VERCEL_ENV` la pone la plataforma, no el repo, así que no se puede falsear
 * desde aquí. Los despliegues de vista previa quedan fuera del freno a
 * propósito: son el sitio donde tiene sentido enseñar la tienda a alguien sin
 * base conectada. */
if (process.env.TIENDA_FIXTURE === "1" && process.env.VERCEL_ENV === "production") {
  throw new Error(
    "TIENDA_FIXTURE=1 en producción. El fixture sirve un catálogo inventado — " +
      "precios y existencias que no existen — y nunca debe atender a un cliente. " +
      "Quita la variable del entorno de producción en Vercel."
  );
}

/** Si la tienda debe leer del fixture en vez de la base. */
export const usarFixture = process.env.TIENDA_FIXTURE === "1";

/* Lo que el fixture NO puede reproducir, y conviene saberlo antes de fiarse de
 * una pantalla:
 *
 *   · `publicado`. `catalogo.json` es el volcado de Mercado Libre ANTES de la
 *     revisión, y los veinticinco productos traen el aviso «descripción
 *     redactada a partir del texto truncado del origen; POR CONFIRMAR antes de
 *     publicar». Con la regla real —la del disparador— no saldría ninguno. Aquí
 *     se muestran todos, así que el fixture enseña un producto MÁS que la
 *     tienda de verdad y no sirve para comprobar qué está publicado.
 *
 *   · El carrito y el checkout. `lib/carrito.ts` lee la tabla por su cuenta y
 *     las acciones escriben; eso sigue necesitando base. Con el fixture se ve
 *     el carrito vacío y poco más.
 *
 *   · El orden por relevancia de la búsqueda. Postgres lo calcula con
 *     `ts_rank`; aquí se filtra por coincidencia de palabras y se conserva el
 *     orden del catálogo.
 */
export async function catalogoDeFixture(): Promise<Publico[]> {
  /* Importado dentro de la función y no arriba: son 48 KB de JSON que no tienen
     por qué entrar en el paquete del servidor cuando el fixture está apagado,
     que es siempre menos en el rato en que alguien lo enciende. */
  const { productos } = await import("@/catalogo/catalogo.json");

  return (productos as Bruto[])
    .map((p) => ({
      slug: p.slug,
      nombre: p.nombre,
      marca: p.marca,
      gtin: p.gtin ?? null,
      /* El precio llega como cadena del volcado. `Number` y no `parseInt`
         porque una cadena rara tiene que dar `NaN` y verse, no colarse
         truncada como un precio plausible. */
      precio_minor: Number(p.precio),
      moneda: p.moneda ?? "COP",
      contenido: p.contenido ?? null,
      imagen: p.imagen ?? null,
      descripcion: p.descripcion ?? null,
      existencias: Number(p.existencias ?? 0),
      atributos: sinVacios(p.atributos),
      actualizado_en: new Date().toISOString()
    }))
    .sort(
      (a, b) =>
        // El mismo orden que la consulta real: lo agotado al final, luego marca
        // y nombre. Si el orden del fixture no coincide, la rejilla se ve
        // distinta aquí y allá y deja de servir para decidir nada.
        Number(a.existencias === 0) - Number(b.existencias === 0) ||
        a.marca.localeCompare(b.marca, "es") ||
        a.nombre.localeCompare(b.nombre, "es")
    );
}

/** Búsqueda sobre el fixture: todas las palabras, sin tildes, como el
 *  diccionario español de la base — que es lo único de `websearch_to_tsquery`
 *  que se puede imitar en diez líneas sin mentir sobre el resto. */
export function buscarEnFixture(catalogo: Publico[], consulta: string): Publico[] {
  const sinTildes = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const palabras = sinTildes(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [];

  return catalogo.filter((p) => {
    const texto = sinTildes(`${p.nombre} ${p.marca} ${p.contenido ?? ""} ${p.descripcion ?? ""}`);
    return palabras.every((palabra) => texto.includes(palabra));
  });
}

/* Cada producto trae los atributos de SU categoría —una crema tiene «tipo de
 * piel», un suplemento no— así que al importar el JSON, TypeScript deduce un
 * tipo por producto con las claves ajenas como `undefined`. Eso no encaja en el
 * `Record<string, string>` de `Publico`, y la conversión no es cosmética:
 * dejando pasar los huecos, la ficha pintaría filas con el valor «undefined».
 * Se quitan aquí, que es donde entra el dato. */
function sinVacios(atributos?: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(atributos ?? {}).filter(([, valor]) => typeof valor === "string")
  ) as Record<string, string>;
}

/** La forma del volcado. No es `Publico`: el JSON trae el precio como cadena y
 *  campos del origen que la tienda no usa. */
type Bruto = {
  slug: string;
  nombre: string;
  marca: string;
  gtin?: string | null;
  precio: string;
  moneda?: string;
  contenido?: string | null;
  imagen?: string | null;
  descripcion?: string | null;
  existencias?: number;
  atributos?: Record<string, string | undefined>;
};
