import { marcas, slugDeMarca } from "@/lib/producto";

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
 *
 * **Sobre azul noche, y no como una línea gris al final.** Es el patrón de pie
 * de la marca, y aquí hace un trabajo concreto: cierra la página. Sin una
 * superficie de peso abajo, un catálogo largo se acaba en el aire y no se nota
 * que la página terminó.
 *
 * **Las marcas se enlazan desde aquí a propósito.** Un pie con enlaces internos
 * a las páginas que queremos que se citen es de las pocas cosas de SEO técnico
 * que sí mueven algo: es el camino por el que un rastreador descubre las
 * páginas de marca desde cualquier ficha. No cuesta una consulta más —`marcas()`
 * se deriva del catálogo que la página ya cargó—.
 */
export async function Pie({ minimo = false }: { minimo?: boolean }) {
  /* En el checkout el pie se queda en el © y nada más. La cabecera ya retira el
     buscador y el carrito porque ofrecer salidas en el paso del pago es una de
     las causas más citadas de abandono; dejar veinte enlaces abajo deshacía esa
     decisión sin que se notara. */
  const lista = minimo ? [] : await marcas();

  return (
    <footer className="mt-20 bg-oliva text-niebla">
      {!minimo && (
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marca/logotipo-blanco.svg"
                alt="Eve-Orígenes"
                width={160}
                height={30}
                className="h-8 w-auto"
              />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed">
              Cuidado de la piel y vida saludable con productos de fabricación colombiana: aceites
              naturales, cuidado facial y suplementos de marcas colombianas, con existencias reales
              y envío desde Bogotá.
            </p>
            {/* Eve-Orígenes es una submarca: se dice de quién es, en texto y sin el
                logo corporativo, que competiría con el propio. */}
            <p className="mt-5 text-sm">Una marca de Evetev S.A.S.</p>
          </div>

          <Columna titulo="Comprar">
            <Enlace href="/">Todo el catálogo</Enlace>
            <Enlace href="/buscar">Buscar</Enlace>
            <Enlace href="/carrito">Carrito</Enlace>
          </Columna>

          <Columna titulo="Marcas">
            {lista.map(({ marca }) => (
              <Enlace key={marca} href={`/marca/${slugDeMarca(marca)}`}>
                {marca}
              </Enlace>
            ))}
          </Columna>

          <Columna titulo="Leer">
            <Enlace href="/blog">Blog</Enlace>
            <Enlace href="/politica-editorial">Cómo escribimos</Enlace>
          </Columna>

          <Columna titulo="Evetev">
            <Enlace href="https://evetev.com">evetev.com</Enlace>
            <Enlace href="https://evetev.com/evepay">EvePay</Enlace>
            <Enlace href="/panel">Administración</Enlace>
          </Columna>
        </div>
      )}

      <div
        className={`mx-auto max-w-6xl px-6 py-6 text-sm ${minimo ? "" : "border-t border-white/10"}`}
      >
        <p>© 2026 Evetev S.A.S. · Bogotá, Colombia</p>
      </div>
    </footer>
  );
}

function Columna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <nav aria-label={titulo}>
      <h2 className="text-[0.8rem] font-semibold uppercase tracking-widest text-white">{titulo}</h2>
      <ul className="mt-4 flex flex-col gap-2.5 text-sm">{children}</ul>
    </nav>
  );
}

/* Al cian en el hover, que es la regla del manual para enlaces sobre azul
 * noche: el eléctrico no tiene contraste suficiente contra ese fondo. */
function Enlace({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="transition-colors hover:text-arena">
        {children}
      </a>
    </li>
  );
}
