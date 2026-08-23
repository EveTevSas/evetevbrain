import { redirect } from "next/navigation";

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function salir() {
  "use server";
  await (await supabase()).auth.signOut();
  redirect("/entrar");
}

export default function SinAcceso() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-3xl font-bold">Tu cuenta no tiene acceso</h1>
      <p className="mt-3 text-sm leading-relaxed text-pizarra">
        Iniciaste sesión correctamente, pero esta cuenta no está en la lista de administradores de
        Eve-Store. La plataforma comparte los usuarios entre productos, así que tener cuenta en uno
        no da acceso a los demás.
      </p>
      <form action={salir} className="mt-6">
        <button className="rounded-lg border border-linea bg-white px-4 py-2 text-sm font-semibold hover:bg-hielo">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
