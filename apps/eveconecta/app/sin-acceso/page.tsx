import { Card } from "@/lib/ui";
import { ShieldAlert } from "lucide-react";
import { BrandMark } from "../../components/brand-mark";

export const dynamic = "force-dynamic";

export default function NoAccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4 py-10">
      <Card className="w-full max-w-lg p-7 text-center sm:p-9">
        <BrandMark priority size={44} />
        <span className="mx-auto mt-6 grid size-12 place-items-center rounded-full bg-[#FFF7ED] text-[var(--eve-alerta)]">
          <ShieldAlert size={22} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Acceso pendiente</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
          La cuenta es válida, pero todavía no tiene una membresía activa en una copropiedad.
          Solicita a la administración de EveConecta que asigne tu perfil.
        </p>
        <form action="/auth/signout" className="mt-7" method="post">
          <button
            className="focus-ring inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)]"
            type="submit"
          >
            Cerrar sesión
          </button>
        </form>
      </Card>
    </main>
  );
}
