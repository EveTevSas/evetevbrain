import { redirect } from "next/navigation";

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function entrar(datos: FormData) {
  "use server";
  const correo = String(datos.get("correo") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");

  const { error } = await (
    await supabase()
  ).auth.signInWithPassword({
    email: correo,
    password: clave
  });

  // El mensaje no distingue entre «no existe» y «clave incorrecta»: decirlo
  // convierte el formulario en un comprobador de qué correos tienen cuenta.
  if (error) redirect("/entrar?error=1");
  redirect("/");
}

export default async function Entrar({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">
        Eve-Store · Panel
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold">Entrar</h1>
      <p className="mt-2 text-sm text-pizarra">
        Solo para el equipo de Evetev. Tener cuenta en la plataforma no da acceso a este panel.
      </p>

      {error && (
        <p className="mt-5 rounded-lg bg-[#fdeaea] px-4 py-3 text-sm text-[#b91c1c]">
          No pudimos entrar con esos datos.
        </p>
      )}

      <form action={entrar} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Correo</span>
          <input
            name="correo"
            type="email"
            required
            autoComplete="username"
            className="w-full rounded-lg border border-linea bg-white px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            name="clave"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-linea bg-white px-3 py-2"
          />
        </label>
        <button className="mt-1 rounded-lg bg-noche px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Entrar
        </button>
      </form>
    </main>
  );
}
