import { Card } from "@/lib/ui";
import { ShieldX } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "../../components/brand-mark";

export const dynamic = "force-dynamic";

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--canvas)] px-4 py-10">
      <Card className="w-full max-w-lg p-7 text-center sm:p-9">
        <BrandMark priority size={44} />
        <span className="mx-auto mt-6 grid size-12 place-items-center rounded-full bg-[#FEF2F2] text-[var(--eve-error)]">
          <ShieldX size={22} />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">Acción no autorizada</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">
          Tu perfil está activo, pero su rol no incluye acceso a esta sección.
        </p>
        <Link
          className="focus-ring mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[var(--eve-mezclado)] px-5 text-sm font-semibold text-white"
          href="/"
        >
          Volver al inicio
        </Link>
      </Card>
    </main>
  );
}
