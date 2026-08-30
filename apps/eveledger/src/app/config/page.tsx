import { prisma } from "@/lib/db";
import ConfigClient from "./ConfigClient";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const productos = await prisma.product.findMany({
    orderBy: { orden: "asc" },
    include: {
      nozzles: {
        orderBy: { nombre: "asc" },
        include: { _count: { select: { readings: true } } }
      }
    }
  });

  return (
    <ConfigClient
      productos={productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        mangueras: p.nozzles.map((n) => ({
          id: n.id,
          nombre: n.nombre,
          activa: n.activa,
          lecturas: n._count.readings
        }))
      }))}
    />
  );
}
