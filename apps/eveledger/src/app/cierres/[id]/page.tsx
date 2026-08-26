import { notFound } from "next/navigation";
import { obtenerCierre } from "@/lib/cierres";
import { listarClientesActivos } from "@/lib/cartera";
import { formatoFecha } from "@/lib/format";
import CierreForm from "@/app/cierres/CierreForm";

export const dynamic = "force-dynamic";

export default async function CierrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cierre = await obtenerCierre(id);
  if (!cierre) notFound();
  const clientes = await listarClientesActivos();

  return (
    <CierreForm
      closeId={cierre.id}
      estado={cierre.estado}
      fechaTexto={formatoFecha(cierre.fecha)}
      lecturas={cierre.lecturas}
      pagos={cierre.pagos}
      vales={cierre.vales}
      faltantes={cierre.faltantes}
      clientes={clientes}
    />
  );
}
