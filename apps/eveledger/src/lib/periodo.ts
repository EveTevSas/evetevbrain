import { prisma } from "@/lib/db";

/**
 * Mes que deben mostrar por defecto las pantallas de reporte.
 *
 * Antes abrían siempre en el mes del calendario, y eso dejaba la aplicación en
 * blanco el día 1 de cada mes: el cierre de ese día todavía está en borrador, y
 * los reportes solo cuentan cierres cerrados. Quien entra a mirar cómo va la
 * estación no quiere una pantalla vacía; quiere el último periodo con operación.
 *
 * En cuanto el mes corriente tiene su primer cierre cerrado, vuelve a ser él.
 */
export async function periodoPorDefecto(): Promise<{ anio: number; mes: number }> {
  const ahora = new Date();
  const actual = { anio: ahora.getUTCFullYear(), mes: ahora.getUTCMonth() + 1 };

  const ultimo = await prisma.dailyClose.findFirst({
    where: { estado: "CLOSED" },
    orderBy: { fecha: "desc" },
    select: { fecha: true }
  });
  if (!ultimo) return actual;

  const f = ultimo.fecha;
  return { anio: f.getUTCFullYear(), mes: f.getUTCMonth() + 1 };
}
