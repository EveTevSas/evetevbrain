import Link from "next/link";
import { notFound } from "next/navigation";
import { detalleCliente } from "@/lib/cartera";
import ClienteDetalle from "./ClienteDetalle";

export const dynamic = "force-dynamic";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await detalleCliente(id);
  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <ClienteDetalle cliente={cliente} />
      <p className="text-sm">
        <Link href="/cartera" className="lnk">
          ← Volver a cartera
        </Link>
      </p>
    </div>
  );
}
