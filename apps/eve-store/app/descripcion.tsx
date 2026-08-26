/* La descripción, con un alto estándar y «Ver más».
 *
 * El problema era de proporción: las descripciones van de tres líneas a
 * cuarenta, así que una ficha se veía compacta y la siguiente dejaba la columna
 * de texto colgando muy por debajo de la foto. Con un tope, todas las fichas
 * ocupan lo mismo y la imagen y los datos guardan la misma relación.
 *
 * **Se pliega sin JavaScript.** Una casilla oculta y `peer` hacen el trabajo que
 * normalmente hace un `useState`, y la diferencia importa: con JavaScript, el
 * texto plegado es texto que alguien sin JS no puede desplegar — está en el
 * HTML pero fuera de su alcance. Así funciona en cualquier navegador y no
 * cuesta un kilobyte de cliente.
 *
 * Sólo se pliega lo que lo necesita. Por debajo del umbral no se recorta nada,
 * y por eso el botón nunca falta donde hace falta: si hay recorte, hay botón.
 * El umbral es de caracteres y no de altura porque esto se decide en el
 * servidor, donde no hay ventana que medir — y errar por abajo sólo significa
 * enseñar entero algo que cabía de todas formas.
 */
const UMBRAL = 520;

export function Descripcion({ parrafos, id }: { parrafos: string[]; id: string }) {
  const largo = parrafos.join(" ").length > UMBRAL;

  const texto = (
    <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink">
      {parrafos.map((parrafo, i) => (
        <p key={i} className="whitespace-pre-line">
          {parrafo}
        </p>
      ))}
    </div>
  );

  if (!largo) return <div className="mt-8">{texto}</div>;

  const boton =
    "cursor-pointer select-none text-sm font-semibold text-noche underline underline-offset-4 hover:opacity-70";

  return (
    <div className="mt-8">
      <input type="checkbox" id={id} className="peer sr-only" />

      <div className="relative max-h-72 overflow-hidden peer-checked:max-h-none">
        {texto}
        {/* El degradado dice «esto sigue» sin escribirlo. Desaparece al
            desplegar, porque entonces ya no hay nada cortado que insinuar. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-tinte to-transparent peer-checked:hidden" />
      </div>

      <label htmlFor={id} className={`mt-3 inline-block peer-checked:hidden ${boton}`}>
        Ver más
      </label>
      <label htmlFor={id} className={`mt-3 hidden peer-checked:inline-block ${boton}`}>
        Ver menos
      </label>
    </div>
  );
}
