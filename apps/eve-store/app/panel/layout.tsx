import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { administrador } from "@/lib/supabase";

/* El panel no se rastrea, y se declara aquí por la misma razón que el guardia:
 * envuelve todas sus páginas, así que una pantalla nueva nace excluida sin que
 * nadie tenga que acordarse. Antes esto lo cubría el `noindex` del layout raíz,
 * que de paso hacía invisible la tienda entera. */
export const metadata: Metadata = {
  title: "Panel · Eve-Store",
  robots: { index: false, follow: false }
};

/* El guardia de autorización del panel.
 *
 * Está aquí y no en el middleware porque comprobar la lista de acceso exige
 * consultar Postgres, y el middleware corre en el borde sin conexión a la base.
 * El middleware garantiza que haya sesión; este layout garantiza que la sesión
 * sea de un administrador. Envuelve TODAS las páginas del panel, así que una
 * página nueva nace protegida sin que nadie tenga que acordarse.
 */
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const quien = await administrador();
  if (!quien) redirect("/sin-acceso");

  return (
    <>
      <div className="border-b border-linea bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2.5 text-xs">
          <span className="text-pizarra">{quien.correo}</span>
          <form action={cerrarSesion}>
            <button className="text-pizarra underline-offset-2 hover:underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
      {children}
    </>
  );
}

async function cerrarSesion() {
  "use server";
  const { supabase } = await import("@/lib/supabase");
  await (await supabase()).auth.signOut();
  redirect("/entrar");
}
