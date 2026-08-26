import { marcas, slugDeMarca } from "@/lib/producto";

/* Filtrar por marca, con enlaces y no con un parámetro.
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
 */
export async function FiltroMarcas({ activa }: { activa?: string }) {
  const lista = await marcas();
  if (lista.length < 2) return null;

  const base = "rounded-full border px-3 py-1.5 text-sm transition-colors";
  const apagado = "border-linea text-pizarra hover:bg-hielo";
  const encendido = "border-noche bg-noche text-white";

  return (
    <nav aria-label="Filtrar por marca" className="mt-6 flex flex-wrap gap-2">
      <a href="/" className={`${base} ${activa ? apagado : encendido}`}>
        Todas
      </a>
      {lista.map(({ marca, cuantos }) => (
        <a
          key={marca}
          href={`/marca/${slugDeMarca(marca)}`}
          className={`${base} ${activa === marca ? encendido : apagado}`}
        >
          {marca} <span className="tabular-nums opacity-70">{cuantos}</span>
        </a>
      ))}
    </nav>
  );
}
