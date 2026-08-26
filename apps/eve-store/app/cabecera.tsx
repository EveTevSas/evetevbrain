import { AvisoCarrito } from "@/app/aviso-carrito";
import { CarritoCabecera } from "@/app/carrito-cabecera";

/* La cabecera: buscar y el carrito, en todas las pantallas.
 *
 * No existía. El buscador y el carrito sólo se alcanzaban bajando hasta el pie,
 * y en una tienda eso equivale a esconderlos: el plan pone «favorecer la
 * búsqueda» y «un CTA claro para añadir al carrito» como razón de ser del
 * producto, y ninguna de las dos cosas estaba a la vista.
 *
 * **El contador del carrito no puede leer la cookie aquí.** La portada y las
 * fichas se sirven con ISR —una consulta por minuto en vez de una por visita, y
 * si la regeneración falla el visitante recibe la copia anterior— y en cuanto
 * un componente lee cookies, Next las vuelve dinámicas y esa red de seguridad
 * desaparece. Cambiar caché por un número al lado de un icono es un mal trato.
 *
 * Así que el número llega por otra vía: `lib/carrito.ts` mantiene una cookie
 * acompañante, `carrito_n`, que lleva SÓLO la cuenta y sí es legible desde el
 * navegador; la pinta `CarritoCabecera`, el único trozo de esta cabecera que
 * se ejecuta en el cliente. El carrito de verdad sigue siendo `carrito`, httpOnly, y sigue
 * releyéndose de la base al pintar. Si alguien manipula `carrito_n` lo único
 * que consigue es ver un número equivocado junto a un enlace.
 *
 * El enlace va en el HTML siempre; el número es un añadido. Un navegador sin
 * JavaScript —o un rastreador de IA, que nunca lo ejecuta— ve la tienda entera
 * y puede navegarla; sólo se pierde una cifra decorativa.
 */

export function Cabecera({ q = "", minima = false }: { q?: string; minima?: boolean }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-linea bg-white/90 backdrop-blur">
        {/* En móvil el buscador baja a su propia fila.
            Compartiendo renglón con la marca y el carrito se quedaba en unos
            cuarenta píxeles —cabía «acei»— y la búsqueda es justo lo que esta
            cabecera vino a resolver. El orden cambia con el ancho: arriba marca y
            carrito, debajo la caja a lo ancho; desde `sm`, los tres en línea. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-6 py-3">
          <a href="/" className="order-1 shrink-0 font-display text-lg font-bold text-noche">
            Eve-Store
          </a>

          {/* En el checkout no hay buscador ni carrito. Ofrecer salidas en el paso
              del pago es una de las causas más citadas de abandono, y el plan pide
              un flujo sin fricción: aquí sólo queda la marca. */}
          {!minima && (
            <>
              <form
                action="/buscar"
                method="get"
                className="order-3 flex w-full min-w-0 gap-2 sm:order-2 sm:w-auto sm:flex-1"
              >
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="aceite de coco, piel grasa…"
                  aria-label="Buscar productos"
                  className="min-w-0 flex-1 rounded-lg border border-linea bg-tinte px-3 py-2 text-sm"
                />
                <button className="shrink-0 rounded-lg bg-noche px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
                  Buscar
                </button>
              </form>

              <div className="order-2 ml-auto sm:order-3 sm:ml-0">
                <CarritoCabecera />
              </div>
            </>
          )}
        </div>
      </header>

      {/* El aviso va FUERA de la cabecera, y no es una preferencia de orden.
          La cabecera lleva `backdrop-blur`, y un `backdrop-filter` crea bloque
          contenedor para sus descendientes `fixed`: dentro, un `fixed bottom-5`
          se ancla a la cabecera en vez de a la ventana, y el aviso aparecía
          arriba, tapando el buscador. */}
      {!minima && <AvisoCarrito />}
    </>
  );
}
