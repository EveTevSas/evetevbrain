import { BotonAnadir } from "@/app/anadir";
import { pesos, type Tarjeta } from "@/lib/producto";

/* La rejilla de productos, una sola vez.
 *
 * La pintaban la portada y, al añadir las páginas de marca, habría hecho falta
 * copiarla. Dos copias de una tarjeta divergen a la primera corrección —el
 * precio se alinea en una y no en la otra— así que vive aquí y la usan las dos.
 */
/* El nivel del titular es un parámetro porque la jerarquía cambia según dónde
 * cuelgue la rejilla. En la portada y en una página de marca, cada producto es
 * un apartado de primer nivel bajo el `h1`, y `h2` es lo correcto. Dentro de
 * «Más de Bio Essens», en cambio, el `h2` es el de la sección y los productos
 * cuelgan de él: repetir `h2` los pone como hermanos del título que los
 * agrupa. Un lector de pantalla navega por esa jerarquía, y quien extrae la
 * página para citarla, también. */
export function Rejilla({ productos, nivel = 2 }: { productos: Tarjeta[]; nivel?: 2 | 3 }) {
  const Titular = nivel === 3 ? "h3" : "h2";

  return (
    <ul className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {productos.map((p) => (
        <li key={p.slug} className="relative">
          <a href={`/producto/${p.slug}`} className="group flex flex-col gap-3">
            <div className="aspect-square overflow-hidden rounded-xl border border-linea bg-white">
              {p.imagen && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.imagen}
                  alt={p.nombre}
                  loading="lazy"
                  className="size-full object-contain p-4"
                />
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-pizarra">{p.marca}</p>
              <Titular className="font-semibold leading-snug group-hover:underline">
                {p.nombre}
                {p.contenido && <span className="font-normal text-pizarra"> · {p.contenido}</span>}
              </Titular>
              <p className="mt-1 font-display text-lg font-bold tabular-nums">
                {pesos.format(p.precio_minor)}
              </p>
              {p.existencias === 0 && <p className="text-xs text-alerta">Agotado</p>}
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
              <BotonAnadir slug={p.slug} nombre={p.nombre} hay={p.existencias > 0} compacto />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
