import { AvisoCarrito } from "@/app/aviso-carrito";
import { CarritoCabecera } from "@/app/carrito-cabecera";
import { NavMarcas } from "@/app/nav-marcas";

/* La cabecera: quién somos, buscar, el carrito y por dónde se navega.
 *
 * No existía. El buscador y el carrito sólo se alcanzaban bajando hasta el pie,
 * y en una tienda eso equivale a esconderlos: el plan pone «favorecer la
 * búsqueda» y «un CTA claro para añadir al carrito» como razón de ser del
 * producto, y ninguna de las dos cosas estaba a la vista.
 *
 * Ahora son tres franjas, y cada una responde a algo que la versión anterior
 * dejaba sin resolver:
 *
 *   1. La promesa. «Envío desde Bogotá», «existencias reales», «sin registro»
 *      vivían enterradas en un párrafo de la portada, así que sólo las leía
 *      quien entraba por la raíz. Quien llega desde una búsqueda cae en una
 *      ficha y nunca las ve. Son las tres objeciones que frenan una compra en
 *      una tienda desconocida; van arriba y en todas las pantallas.
 *
 *   2. La marca. Era la palabra «Eve-Store» en texto plano: la única app del
 *      repo sin isotipo ni favicon. Ahora sale de `/marca`, servida desde este
 *      mismo origen como en el resto de apps — no hay CDN.
 *
 *   3. La navegación. El filtro por marcas sólo estaba en la portada y en las
 *      páginas de marca. Subirlo a la cabecera es lo que convierte una lista de
 *      productos en una tienda navegable: desde una ficha se puede saltar a
 *      otra marca sin volver atrás.
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
 * se ejecuta en el cliente. El carrito de verdad sigue siendo `carrito`,
 * httpOnly, y sigue releyéndose de la base al pintar. Si alguien manipula
 * `carrito_n` lo único que consigue es ver un número equivocado junto a un
 * enlace.
 *
 * El enlace va en el HTML siempre; el número es un añadido. Un navegador sin
 * JavaScript —o un rastreador de IA, que nunca lo ejecuta— ve la tienda entera
 * y puede navegarla; sólo se pierde una cifra decorativa.
 */

export function Cabecera({
  q = "",
  minima = false,
  marcaActiva
}: {
  q?: string;
  minima?: boolean;
  marcaActiva?: string;
}) {
  return (
    <>
      {/* La franja de la promesa NO es sticky, y es deliberado: se lee una vez
          al llegar y luego estorba. Se va con el scroll y deja pegada sólo la
          fila que se usa —marca, búsqueda, carrito—. En el checkout no aparece:
          ahí ya no hay nada que convencer. */}
      {!minima && (
        <p className="bg-oliva text-center text-xs text-niebla sm:text-[0.8rem]">
          {/* La frase larga —«Existencias reales: si dice que hay, hay»— sólo
              aparece desde `sm`. En 375 px las tres promesas completas ocupaban
              TRES renglones de barra oscura antes de que empezara la tienda: más
              alto que la propia cabecera. En móvil se dice lo mismo en corto y
              la versión con el remate vive en la portada, que es donde hay sitio
              para rematar. */}
          <span className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-6 py-2">
            <span>Envío desde Bogotá</span>
            <span aria-hidden="true" className="text-petroleo">
              ·
            </span>
            <span>
              Existencias reales<span className="hidden sm:inline">: si dice que hay, hay</span>
            </span>
            <span aria-hidden="true" className="text-petroleo">
              ·
            </span>
            <span>Sin registro</span>
          </span>
        </p>
      )}

      <header className="sticky top-0 z-30 border-b border-salvia bg-white/90 backdrop-blur">
        {/* En móvil el buscador baja a su propia fila.
            Compartiendo renglón con la marca y el carrito se quedaba en unos
            cuarenta píxeles —cabía «acei»— y la búsqueda es justo lo que esta
            cabecera vino a resolver. El orden cambia con el ancho: arriba marca y
            carrito, debajo la caja a lo ancho; desde `sm`, los tres en línea. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <a
            href="/"
            className="order-1 flex shrink-0 items-center gap-2.5 text-oliva"
            aria-label="Eve-Orígenes, ir a la portada"
          >
            {/* El logotipo completo —la hoja y el nombre en El Messiri— como un
                solo SVG extraído del manual. No se compone con texto vivo: así
                el nombre sale igual aunque la fuente tarde en cargar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marca/logotipo-oliva.svg"
              alt=""
              width={148}
              height={28}
              className="h-7 w-auto"
            />
          </a>

          {/* En el checkout no hay buscador ni carrito. Ofrecer salidas en el paso
              del pago es una de las causas más citadas de abandono, y el plan pide
              un flujo sin fricción: aquí sólo queda la marca. */}
          {!minima && (
            <>
              {/* Acotado con `max-w-xl`. Antes crecía hasta comerse la fila
                  entera y la marca quedaba arrinconada como en un formulario;
                  una caja de búsqueda no necesita 700 px para caber. */}
              <form
                action="/buscar"
                method="get"
                role="search"
                className="order-3 flex w-full min-w-0 gap-2 sm:order-2 sm:w-auto sm:max-w-xl sm:flex-1"
              >
                <div className="relative flex min-w-0 flex-1 items-center">
                  <IconoLupa />
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="aceite de coco, piel grasa…"
                    aria-label="Buscar productos"
                    className="min-w-0 flex-1 rounded-full border border-salvia bg-niebla py-2 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-oliva/70 focus:border-jade focus:bg-white focus:ring-2 focus:ring-jade/30"
                  />
                </div>
                {/* Pill, no rectángulo (regla de forma: los botones son pill
                    siempre). Y en azul noche, no coral: el coral está reservado
                    a la acción principal de la vista, que en una tienda es
                    añadir al carrito. */}
                <button className="shrink-0 rounded-full bg-oliva px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                  Buscar
                </button>
              </form>

              {/* El blog va junto al carrito y no en la fila de marcas: esa fila es
                  el catálogo, y un enlace editorial entre las marcas se leería como
                  una marca más. */}
              <div className="order-2 ml-auto flex items-center gap-4 sm:order-3 sm:ml-0">
                <a
                  href="/blog"
                  className="text-sm font-semibold text-oliva hover:text-petroleo hover:underline"
                >
                  Blog
                </a>
                <CarritoCabecera />
              </div>
            </>
          )}
        </div>

        {/* La navegación por marcas, pegada bajo la fila de marca. Va DENTRO del
            sticky para que siga alcanzable al bajar por un catálogo largo. */}
        {!minima && <NavMarcas activa={marcaActiva} />}
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

/* La lupa dentro de la caja, no al lado.
 *
 * Un campo de texto sin ninguna marca es indistinguible de cualquier otro
 * input; la lupa es la convención que dice «aquí se busca» sin gastar una
 * palabra. Va en línea y `aria-hidden`: el campo ya se anuncia con su
 * `aria-label`, y repetirlo en el icono lo diría dos veces. */
function IconoLupa() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      className="pointer-events-none absolute left-3.5 size-4 text-oliva"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
