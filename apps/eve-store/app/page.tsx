/* La raíz queda reservada para la tienda. Mientras no exista, esta página dice
 * lo que hay — y no redirige al panel a propósito: la portada de una tienda no
 * debe llevar a nadie a una pantalla de inicio de sesión. */
export default function Portada() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">Eve-Store</p>
      <h1 className="mt-1 font-display text-3xl font-bold">Todavía no hay tienda</h1>
      <p className="mt-3 text-sm leading-relaxed text-pizarra">
        El catálogo está cargado y en revisión. Esta dirección será la tienda; mientras tanto, el
        panel de administración vive en{" "}
        <a href="/panel" className="underline">
          /panel
        </a>
        .
      </p>
    </main>
  );
}
