/* El pie de la tienda.
 *
 * Lleva el acceso al panel porque si no, no hay ninguno: el enlace vivía en la
 * pantalla de «todavía no hay tienda», y al publicarse el primer producto esa
 * pantalla desapareció y se llevó el enlace con ella. Quedó un panel al que
 * solo se llegaba recordando la URL.
 *
 * Enlazarlo en público no abre nada: `/panel` exige sesión y estar en la lista
 * de administradores. Y el robots.txt lo excluye, así que tampoco invita a los
 * rastreadores a llamar a esa puerta.
 */
export function Pie() {
  return (
    <footer className="mt-20 border-t border-linea">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-pizarra">
        <p>© 2026 Evetev S.A.S. · Bogotá, Colombia</p>
        <nav className="flex gap-5">
          <a href="/" className="hover:underline">
            Productos
          </a>
          <a href="/buscar" className="hover:underline">
            Buscar
          </a>
          <a href="/carrito" className="hover:underline">
            Carrito
          </a>
          <a href="/panel" className="hover:underline">
            Administración
          </a>
        </nav>
      </div>
    </footer>
  );
}
