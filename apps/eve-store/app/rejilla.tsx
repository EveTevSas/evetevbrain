import { BotonAnadir } from "@/app/anadir";
import { pesos, type Tarjeta } from "@/lib/producto";

/* La rejilla de productos, una sola vez.
 *
 * La pintaban la portada y, al añadir las páginas de marca, habría hecho falta
 * copiarla. Dos copias de una tarjeta divergen a la primera corrección —el
 * precio se alinea en una y no en la otra— así que vive aquí y la usan las dos.
 */
/* El nivel del titular es un parámetro porque la jerarquía cambia según dónde
 * cuelgue la rejilla. En una página de marca, cada producto es un apartado de
 * primer nivel bajo el `h1`, y `h2` es lo correcto. Dentro de «Más de Bio
 * Essens» —o bajo el «Todo el catálogo» de la portada—, en cambio, el `h2` es
 * el de la sección y los productos cuelgan de él: repetir `h2` los pone como
 * hermanos del título que los agrupa. Un lector de pantalla navega por esa
 * jerarquía, y quien extrae la página para citarla, también. */
export function Rejilla({ productos, nivel = 2 }: { productos: Tarjeta[]; nivel?: 2 | 3 }) {
  const Titular = nivel === 3 ? "h3" : "h2";

  /* Dos columnas ya en móvil. Una sola tarjeta por fila obliga a desplazar
   * veinticinco veces para ver el catálogo, y ninguna tienda hace eso: comparar
   * es a lo que se viene, y comparar exige ver dos cosas a la vez. Cuatro
   * columnas en pantalla grande, por lo mismo. */
  return (
    <ul className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {productos.map((p) => {
        const hay = p.existencias > 0;

        return (
          /* La tarjeta es una tarjeta de verdad: superficie blanca, borde y
             elevación al pasar por encima. Antes la foto tenía marco y el texto
             quedaba suelto sobre el fondo de la página, así que en una rejilla
             de cuatro columnas no se veía dónde acababa un producto y empezaba
             el siguiente. El `-translate-y` y la sombra son los del manual, y
             `motion-reduce` los desactiva: la información no depende de ellos. */
          <li
            key={p.slug}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-salvia bg-white transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(86,93,71,0.09)] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <a href={`/producto/${p.slug}`} className="flex flex-1 flex-col">
              <div className="relative aspect-square overflow-hidden bg-white">
                {p.imagen && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    loading="lazy"
                    className="size-full object-contain p-4 transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                  />
                )}

                {/* Agotado se dice arriba y sobre la foto, no en una línea de
                    texto debajo del precio. Es lo primero que hay que saber de
                    un producto que no se puede comprar: enterarse después de
                    haber leído nombre y precio es enterarse tarde. Y la foto se
                    apaga, para que la señal no dependa sólo de leer (C5). */}
                {!hay && (
                  <>
                    <div className="absolute inset-0 bg-white/55" />
                    <p className="absolute left-3 top-3 rounded-full bg-oliva/85 px-2.5 py-1 text-xs font-semibold text-white">
                      Agotado
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="text-[0.7rem] font-medium uppercase tracking-wide text-oliva">
                  {p.marca}
                </p>
                <Titular className="mt-0.5 text-sm font-semibold leading-snug group-hover:underline">
                  {p.nombre}
                </Titular>
                {p.contenido && <p className="mt-0.5 text-xs text-oliva">{p.contenido}</p>}

                {/* `mt-auto` clava el precio abajo. Sin él, un nombre de dos
                    líneas y otro de una dejaban los precios a alturas
                    distintas, y una rejilla de precios desalineados es
                    exactamente lo que impide comparar de un vistazo. */}
                <p
                  className={`mt-auto pt-3 font-display text-lg font-bold tabular-nums ${
                    hay ? "" : "text-oliva"
                  }`}
                >
                  {pesos.format(p.precio_minor)}
                </p>
              </div>
            </a>

            {/* El botón no puede ir DENTRO del enlace: un botón dentro de un
                ancla es HTML inválido y el navegador decide por su cuenta qué
                pasa al pulsarlo. Va superpuesto en una capa que calca la caja de
                la foto —mismo ancho, mismo `aspect-square`— y que no intercepta
                el ratón salvo en el propio botón, para que el resto de la imagen
                siga llevando a la ficha. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
              <div className="pointer-events-auto absolute bottom-3 right-3">
                <BotonAnadir slug={p.slug} nombre={p.nombre} hay={hay} compacto />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
