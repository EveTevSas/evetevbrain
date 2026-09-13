import { marcas, slugDeMarca } from "@/lib/producto";

/* Las marcas como navegación, con enlaces y no con un parámetro.
 *
 * La tentación era `?marca=` sobre la portada, y habría sido un error: en
 * cuanto la portada lee un parámetro deja de ser estática, y se pierde el ISR
 * —una consulta por minuto en vez de una por visita, y la copia anterior si la
 * regeneración falla— a cambio de un filtro.
 *
 * Con `/marca/dermanat` cada marca es una página de verdad: se prerenderiza,
 * tiene su propio título y su descripción, se puede compartir y se puede citar.
 * Un filtro que sólo existe como estado de la interfaz no es enlazable, y lo
 * que no es enlazable no aparece en ninguna respuesta de IA.
 *
 * **Vive en la cabecera y no en el cuerpo de la portada**, que es lo que antes
 * lo hacía inútil: estaba en la raíz y en las páginas de marca, o sea en las
 * dos pantallas desde las que menos falta hace. Quien entra por una búsqueda
 * cae en una ficha, y desde allí no había ninguna forma de ver qué más marcas
 * existen sin volver a la portada.
 *
 * Es una fila de enlaces y no de píldoras a propósito: bajo la fila de marca y
 * búsqueda, un segundo renglón de cápsulas oscuras compite con el buscador por
 * la mirada. Como navegación —texto en pizarra, subrayado teal en la activa—
 * se lee como lo que es, y el teal es el identificador de la línea Tienda.
 *
 * No consulta la base por su cuenta: `marcas()` se deriva del catálogo ya
 * cargado, así que aparecer en todas las pantallas no cuesta una consulta más.
 */
export async function NavMarcas({ activa }: { activa?: string }) {
  const lista = await marcas();
  if (lista.length < 2) return null;

  const base = "shrink-0 border-b-2 py-2.5 text-sm transition-colors whitespace-nowrap -mb-px";
  const apagado = "border-transparent text-pizarra hover:text-noche";
  const encendido = "border-teal font-semibold text-noche";

  return (
    /* El degradado del borde derecho es la única pista de que la fila sigue.
       Sin él, en móvil el último nombre visible queda cortado a hueso y parece
       que ahí se acaban las marcas: se desliza quien ya sabe que puede. */
    <nav
      aria-label="Marcas"
      className="relative border-t border-linea/70 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-10 after:bg-gradient-to-l after:from-white after:to-transparent sm:after:hidden"
    >
      {/* `overflow-x-auto` y no `flex-wrap`: con seis marcas ya son dos
          renglones en móvil, y una cabecera que crece hacia abajo se come la
          pantalla justo donde menos sobra. Se desliza.

          La barra de desplazamiento se oculta —y va en ESTE div, que es el que
          desborda, no en el `nav`— porque dibujada deja un riel gris pegado al
          borde de la cabecera que parece un fallo de maquetación. El contenido
          sigue siendo alcanzable con dedo, rueda y teclado. */}
      <div className="mx-auto flex max-w-6xl gap-5 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <a href="/" className={`${base} ${activa ? apagado : encendido}`}>
          Todo el catálogo
        </a>
        {lista.map(({ marca, cuantos }) => (
          <a
            key={marca}
            href={`/marca/${slugDeMarca(marca)}`}
            className={`${base} ${activa === marca ? encendido : apagado}`}
          >
            {marca} <span className="tabular-nums text-pizarra/60">{cuantos}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
