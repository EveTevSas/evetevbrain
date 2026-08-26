import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerInventarioDia } from "@/lib/inventarios";
import { formatoFecha, inputAFecha } from "@/lib/format";
import InventarioForm from "./InventarioForm";

export const dynamic = "force-dynamic";

export default async function InventarioDiaPage({
  params
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;
  const data = await obtenerInventarioDia(fecha);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <InventarioForm
        fecha={data.fecha}
        fechaTexto={formatoFecha(inputAFecha(data.fecha))}
        cierreCerrado={data.cierreCerrado}
        productos={data.productos}
      />
      <p className="text-sm">
        <Link href="/inventarios" className="lnk">
          ← Volver a inventarios
        </Link>
      </p>
    </div>
  );
}
