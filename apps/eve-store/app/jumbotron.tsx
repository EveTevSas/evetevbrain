/* La banda de imagen de cabecera, una sola vez.
 *
 * La usan la portada y las páginas de marca que tienen foto. Lo que se repite
 * no es el texto —ese cambia entero— sino el armazón: una imagen absoluta bajo
 * el contenido, un velo que garantiza el contraste, y el encuadre. Copiado, eso
 * diverge a la primera corrección y acabas con una banda donde el texto se lee
 * y otra donde no.
 *
 * **El velo no es decoración.** `object-cover` recorta distinto en cada ancho de
 * pantalla, así que apoyar el texto en «la zona despejada de la foto» es
 * apoyarlo donde algún tamaño de ventana pondrá un frasco blanco o una cara. El
 * velo hace que el contraste no dependa del recorte. Se probó aligerarlo en la
 * portada y la entradilla caía a ~3,6:1 sobre el azul del fondo, por debajo de
 * AA; donde hay texto, el velo va fuerte.
 *
 * `lado` es dónde va el TEXTO, y sale de cómo está encuadrada cada foto: el
 * bodegón del spa tiene el motivo abajo a la izquierda, así que el texto va a la
 * derecha; el banner de Dermanat lo tiene a la derecha, así que va a la
 * izquierda. El velo se orienta solo en consecuencia.
 *
 * `tono` existe porque no todas las fotos admiten el mismo tratamiento. El velo
 * oscuro sobre azul noche es el patrón del manual, y funciona con el spa. Sobre
 * el banner de Dermanat —gris cálido, claro, editorial— ese mismo velo lo
 * ensucia y le cambia el carácter a una imagen que es de la marca, no nuestra.
 * Ahí el velo va claro y el texto en azul noche, que sobre ese fondo da ~14:1.
 * La regla que manda es el contraste; el color del velo es el medio.
 *
 * En móvil el velo SIEMPRE es vertical, sea cual sea `lado`: con la columna
 * estrecha el recorte deja de garantizar de qué lado cae el aire.
 */
export function Jumbotron({
  imagen,
  encuadre,
  lado,
  tono,
  alto = "min-h-[26rem] sm:min-h-[30rem] lg:min-h-[34rem] xl:min-h-[38rem]",
  columna = "sm:w-1/2",
  children
}: {
  /** Ruta servida desde `/marca`, publicada con `pnpm marca:imagen`. */
  imagen: string;
  /** Clases de `object-position`. Admite variantes responsive: el recorte bueno
   *  en escritorio casi nunca es el bueno en móvil. */
  encuadre: string;
  /** Dónde va el texto. El velo se orienta al revés, hacia ese lado. */
  lado: "izquierda" | "derecha";
  tono: "oscuro" | "claro";
  /* La altura sube con el ancho, y ésa es la corrección que de verdad importaba.
   *
   * Con alto fijo, la banda se vuelve más apaisada cuanto mayor es la pantalla:
   * a 1009 px medía 2,4:1 —casi la proporción de la foto, sin recorte— y a 1920
   * saltaba a 4,6:1 y se comía media imagen. En Ilovepinch eso dejaba fuera el
   * labial entero: en el portátil se veía bien y en un monitor no, que es el
   * fallo más difícil de pillar porque depende de en qué pantalla mires.
   *
   * Los escalones mantienen la banda por debajo de ~3,5:1 en anchos grandes. No
   * es `aspect-ratio` a secas porque en móvil hace falta un mínimo en píxeles:
   * el texto ocupa lo que ocupa y no cabe en una banda proporcional y estrecha. */
  alto?: string;
  /* Cuánto ancho ocupa el texto. La mitad vale para casi todo, pero cuando la
     banda es más ancha que la proporción de la foto —y a estas alturas lo es
     siempre— `object-cover` NO recorta nada horizontalmente: se ve la imagen
     entera y el motivo cae donde cae. Si el hueco despejado es más estrecho que
     media banda, mover el encuadre no sirve de nada; lo que hay que estrechar es
     la columna. */
  columna?: string;
  children: React.ReactNode;
}) {
  /* Cadenas literales completas y no compuestas a trozos: Tailwind rastrea el
     texto del archivo, y una clase armada por concatenación no existe para él. */
  /* La parada intermedia va al 55% y no al 50% por defecto, y con el velo casi
     entero: así el lado del texto se mantiene opaco de verdad —el contraste no
     depende del recorte— y la caída se concentra en el tramo corto que queda,
     en vez de repartirse por toda la banda lavando la foto de punta a punta.
     Con el degradado centrado, el producto de Ilovepinch salía descolorido a
     media anchura aunque allí no hubiera una sola letra. */
  const velo =
    tono === "oscuro"
      ? lado === "derecha"
        ? "bg-gradient-to-t from-noche/90 via-noche/70 to-noche/25 sm:bg-gradient-to-l sm:from-noche/90 sm:via-noche/80 sm:via-55% sm:to-noche/5"
        : "bg-gradient-to-t from-noche/90 via-noche/70 to-noche/25 sm:bg-gradient-to-r sm:from-noche/90 sm:via-noche/80 sm:via-55% sm:to-noche/5"
      : lado === "derecha"
        ? "bg-gradient-to-t from-white/95 via-white/80 to-white/20 sm:bg-gradient-to-l sm:from-white/95 sm:via-white/85 sm:via-55% sm:to-white/5"
        : "bg-gradient-to-t from-white/95 via-white/80 to-white/20 sm:bg-gradient-to-r sm:from-white/95 sm:via-white/85 sm:via-55% sm:to-white/5";

  return (
    <section
      className={`relative isolate flex overflow-hidden ${alto} ${
        tono === "oscuro" ? "text-white" : "text-noche"
      } items-end sm:items-center`}
    >
      {/* Sin `lazy` y con prioridad: es la imagen más grande de la primera
          pantalla, o sea la que marca el LCP. Cargarla perezosa retrasa
          exactamente lo que mide el presupuesto del plan.
          `alt` vacío porque es decorativa: lo que significa la banda lo dice el
          `h1` que va encima, y describirla otra vez lo diría dos veces. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imagen}
        alt=""
        fetchPriority="high"
        className={`absolute inset-0 -z-10 size-full object-cover ${encuadre}`}
      />
      <div aria-hidden="true" className={`absolute inset-0 -z-10 ${velo}`} />

      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
        <div className={`${lado === "derecha" ? "sm:ml-auto" : ""} ${columna}`}>{children}</div>
      </div>
    </section>
  );
}
