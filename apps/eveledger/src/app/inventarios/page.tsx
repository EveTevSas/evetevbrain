import Link from "next/link";
import { inventarioMensual } from "@/lib/inventarios";
import { fechaAInput } from "@/lib/format";
import AccordionInventario from "@/components/accordion-inventario";
import type { ProductoSerial } from "@/components/accordion-inventario";
import { periodoPorDefecto } from "@/lib/periodo";

export const dynamic = "force-dynamic";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

export default async function InventariosPage({
  searchParams
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const porDefecto = await periodoPorDefecto();
  const anio = Number(sp.anio) || porDefecto.anio;
  const mes = Number(sp.mes) || porDefecto.mes;

  const { diasEnMes, productos } = await inventarioMensual(anio, mes);
  const anios = [anio - 2, anio - 1, anio, anio + 1];

  /* ── Serializar Map → array plano para el Client Component ── */
  const productosSerial: ProductoSerial[] = productos.map((p) => {
    const filas = Array.from({ length: diasEnMes }, (_, i) => i + 1).map((dia) => {
      const f = p.dias.get(dia)!;
      const fecha = fechaAInput(new Date(Date.UTC(anio, mes - 1, dia)));
      return { dia, ...f, fecha };
    });
    return {
      id: p.id,
      nombre: p.nombre,
      filas,
      totalCompras: filas.reduce((s, f) => s + f.compras, 0),
      alertas: filas.filter((f) => f.alerta).length,
      diasConFisico: filas.filter((f) => f.fisico !== null).length
    };
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p
            style={{
              margin: "0 0 0.2rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#4b3075"
            }}
          >
            Operación diaria
          </p>
          <h1 style={{ margin: 0 }}>Inventarios</h1>
        </div>
      </div>

      {/* Selector de mes */}
      <form
        method="get"
        style={{
          background: "#fff",
          border: "1px solid #EDF3FA",
          borderRadius: 14,
          padding: "1rem 1.25rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            htmlFor="mes"
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#334155"
            }}
          >
            Mes
          </label>
          <select id="mes" name="mes" defaultValue={mes} className="inp" style={{ width: 140 }}>
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            htmlFor="anio"
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#334155"
            }}
          >
            Año
          </label>
          <select id="anio" name="anio" defaultValue={anio} className="inp" style={{ width: 100 }}>
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="btn btn-sec"
          style={{ minHeight: 42, padding: "0 1.25rem", fontSize: "0.82rem" }}
        >
          Ver
        </button>

        {/* Mes actual a la derecha */}
        <p
          style={{
            marginLeft: "auto",
            fontSize: "0.8rem",
            color: "#64748B",
            alignSelf: "center"
          }}
        >
          {MESES[mes - 1]} {anio} — {diasEnMes} días
        </p>
      </form>

      {/* Acordeón de productos */}
      <AccordionInventario productos={productosSerial} />

      <p className="text-sm">
        <Link href="/cierres" className="lnk">
          ← Volver al diario
        </Link>
      </p>
    </div>
  );
}
