/* El feed de producto.
 *
 * Es la apuesta central del producto, y conviene recordar por qué: en 2026 los
 * canales agénticos son tres —UCP, ACP y AP2— y ninguno está estabilizado;
 * OpenAI apagó Instant Checkout en marzo tras integrarse una treintena de
 * comercios. Construir contra un cliente concreto es apostar a un canal que
 * puede cerrarse. Lo que los tres consumen, y también Google Merchant, es un
 * feed exacto y fresco. Ahí va el esfuerzo.
 *
 * Formato RSS 2.0 con el espacio de nombres `g:` de Google, que es el que
 * entienden todos sin traducción.
 *
 * **Frescura.** El plan exige que un cambio de precio o de existencias se
 * refleje en quince minutos como máximo. Aquí se cumple por construcción: el
 * feed se genera contra la base en cada petición, así que el retraso es cero.
 * No hay copia intermedia que pueda quedarse vieja — y una copia vieja es peor
 * que no tener feed, porque el canal aprende a desconfiar.
 */
import { publicados } from "@/lib/producto";
import { urlBase } from "@/lib/url";

export const revalidate = 300;

/** Escapa lo que rompería el XML. Sin esto, un `&` en un nombre invalida el feed entero. */
function xml(t: string | null | undefined) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const base = urlBase();
  const productos = await publicados();

  const items = productos
    .map((p) => {
      const nombre = p.contenido ? `${p.nombre} ${p.contenido}` : p.nombre;
      const campos = [
        `<g:id>${xml(p.slug)}</g:id>`,
        `<g:title>${xml(nombre)}</g:title>`,
        `<g:description>${xml(p.descripcion)}</g:description>`,
        `<g:link>${base}/producto/${xml(p.slug)}</g:link>`,
        // El precio va con la moneda pegada, que es como lo pide el formato:
        // «35500 COP». El número sigue sin formato de miles.
        `<g:price>${p.precio_minor} ${xml(p.moneda)}</g:price>`,
        `<g:availability>${p.existencias > 0 ? "in_stock" : "out_of_stock"}</g:availability>`,
        `<g:quantity>${p.existencias}</g:quantity>`,
        `<g:brand>${xml(p.marca)}</g:brand>`,
        `<g:condition>new</g:condition>`
      ];

      // El GTIN solo si existe. Un identificador inventado cruza este producto
      // con otro distinto, que es peor que no tener ninguno — y los canales
      // aceptan `identifier_exists` en falso cuando de verdad no lo hay.
      if (p.gtin) campos.push(`<g:gtin>${xml(p.gtin)}</g:gtin>`);
      else campos.push(`<g:identifier_exists>no</g:identifier_exists>`);

      if (p.imagen) campos.push(`<g:image_link>${xml(p.imagen)}</g:image_link>`);

      for (const [k, v] of Object.entries(p.atributos ?? {})) {
        campos.push(
          `<g:product_detail><g:attribute_name>${xml(
            k.replace(/_/g, " ")
          )}</g:attribute_name><g:attribute_value>${xml(v)}</g:attribute_value></g:product_detail>`
        );
      }

      return `    <item>\n      ${campos.join("\n      ")}\n    </item>`;
    })
    .join("\n");

  const cuerpo = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Eve-Store</title>
    <link>${base}</link>
    <description>Aceites naturales, cuidado facial y suplementos de marcas colombianas.</description>
${items}
  </channel>
</rss>
`;

  return new Response(cuerpo, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // Un cuarto de hora de caché en el borde es exactamente la ventana que
      // exige el canal, y `stale-while-revalidate` evita que una petición
      // pague la regeneración.
      "cache-control": "public, max-age=0, s-maxage=900, stale-while-revalidate=900"
    }
  });
}
