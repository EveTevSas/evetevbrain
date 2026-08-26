/* El carrito, dibujado una vez.
 *
 * Lo usan la cabecera y el botón de cada tarjeta, y tienen que ser el mismo
 * dibujo: el usuario aprende que ese icono significa «carrito» al pulsarlo en
 * una tarjeta, y ese aprendizaje sólo sirve si al mirar arriba encuentra la
 * misma forma. Va en línea y no como imagen para que herede el color del texto
 * y no cueste una petición. */
export function IconoCarrito({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M2.5 3h2.2l2.1 11.2a1.8 1.8 0 0 0 1.8 1.5h8.6a1.8 1.8 0 0 0 1.8-1.4l1.4-6.3H5.7" />
      <circle cx="9.5" cy="20" r="1.5" />
      <circle cx="17.5" cy="20" r="1.5" />
    </svg>
  );
}
