import { Boton, Campo, Plegable, entrada, rejilla } from "@/components/formulario";
import { Aviso, Chip, PRODUCTOS, Tarjeta, TituloSeccion, Vacio } from "@/components/seccion";
import { formatoMonto, nombreMes, pct } from "@/lib/formato";
import { rollupDelMes } from "@/lib/hub/rollups";
import { borrarCostoAccion, guardarCostoAccion } from "../acciones";

export const dynamic = "force-dynamic";

export default async function FinanzasPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  const r = await rollupDelMes();
  const total = r.ingresos.totalMinor;
  const fila: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.7rem",
    padding: "0.55rem 0",
    borderBottom: "1px solid #F1F5F9",
    fontSize: "0.83rem"
  };

  return (
    <>
      <TituloSeccion
        titulo="Ingresos & costos"
        descripcion={`Lo que entra por producto vs. lo que pagas a proveedores = margen real · ${nombreMes(r.mes)}`}
      />
      {typeof error === "string" && <Aviso tono="alerta">{error}</Aviso>}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
          gap: "1rem"
        }}
      >
        <Tarjeta
          titulo="Ingresos por producto"
          extra={<span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>MRR + procesamiento</span>}
        >
          <div style={fila}>
            <Chip tono="morado" punto>
              EvePay
            </Chip>
            <span style={{ flex: 1, color: "#64748B" }}>comisiones según ledger</span>
            <strong>{formatoMonto(r.ingresos.evepayMinor)}</strong>
          </div>
          <div style={fila}>
            <Chip tono="azul" punto>
              EveConecta
            </Chip>
            <span style={{ flex: 1, color: "#64748B" }}>
              {r.mrr.eveconecta.suscriptores} suscripción(es) · MRR
            </span>
            <strong>{formatoMonto(r.ingresos.eveconectaMinor)}</strong>
          </div>
          <div style={fila}>
            <Chip tono="ok" punto>
              EveLedger
            </Chip>
            <span style={{ flex: 1, color: "#64748B" }}>
              {r.mrr.eveledger.suscriptores} estación(es) · MRR
            </span>
            <strong>{formatoMonto(r.ingresos.eveledgerMinor)}</strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "0.9rem",
              fontWeight: 800
            }}
          >
            <span>Total ingresos</span>
            <span>{formatoMonto(total)}</span>
          </div>
          {r.evepay && (
            <p
              style={{
                margin: "0.8rem 0 0",
                fontSize: "0.72rem",
                color: "#94A3B8",
                lineHeight: 1.5
              }}
            >
              Referencia: el costo del proveedor de pagos según el ledger de EvePay fue{" "}
              {formatoMonto(r.evepay.costoMesMinor)} este mes. No se suma abajo: la factura real se
              registra cuando llega.
            </p>
          )}
        </Tarjeta>
        <Tarjeta
          titulo="Costos de proveedores"
          extra={<span style={{ fontSize: "0.72rem", color: "#94A3B8" }}>{nombreMes(r.mes)}</span>}
        >
          {r.costos.length === 0 ? (
            <Vacio>Sin costos registrados este mes.</Vacio>
          ) : (
            r.costos.map((c) => (
              <div key={c.id} style={fila}>
                <span style={{ flex: 1 }}>
                  <strong>{c.proveedor}</strong>
                  {c.concepto && <span style={{ color: "#64748B" }}> · {c.concepto}</span>}
                </span>
                <Chip tono="gris">{c.categoria}</Chip>
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatoMonto(c.montoMinor)}
                </strong>
                <form action={borrarCostoAccion}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    title="Quitar"
                    style={{
                      border: "none",
                      background: "none",
                      color: "#CBD5E1",
                      cursor: "pointer"
                    }}
                  >
                    ×
                  </button>
                </form>
              </div>
            ))
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "0.9rem",
              fontWeight: 800
            }}
          >
            <span>Total proveedores</span>
            <span>{formatoMonto(r.costosMinor)}</span>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <Plegable titulo="+ Registrar un costo">
              <form action={guardarCostoAccion} style={rejilla}>
                <Campo etiqueta="Mes">
                  <input
                    name="mes"
                    type="month"
                    defaultValue={r.mes.slice(0, 7)}
                    required
                    style={entrada}
                  />
                </Campo>
                <Campo etiqueta="Proveedor">
                  <input name="proveedor" required placeholder="ComboPay" style={entrada} />
                </Campo>
                <Campo etiqueta="Concepto">
                  <input name="concepto" placeholder="comisión de procesamiento" style={entrada} />
                </Campo>
                <Campo etiqueta="Categoría">
                  <select name="categoria" defaultValue="pagos" style={entrada}>
                    {["pagos", "infra", "mensajeria", "ia", "herramientas", "otros"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Campo>
                <Campo etiqueta="Monto (COP)">
                  <input name="monto" inputMode="numeric" required style={entrada} />
                </Campo>
                <Boton>Guardar</Boton>
              </form>
            </Plegable>
          </div>
        </Tarjeta>
      </div>
      <div
        style={{
          background: "linear-gradient(120deg, #0A2540, #1e3a5f)",
          color: "#fff",
          borderRadius: 16,
          padding: "1.2rem 1.4rem",
          marginTop: "1rem",
          display: "flex",
          gap: "1.5rem",
          flexWrap: "wrap",
          alignItems: "baseline",
          fontVariantNumeric: "tabular-nums"
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>Margen del mes</div>
          <div style={{ fontSize: "0.74rem", color: "#A9B8CC" }}>
            Ingresos − costos de proveedores
          </div>
        </div>
        <span style={{ fontSize: "0.85rem", color: "#C9D3E0" }}>
          Ingresos <strong style={{ color: "#fff" }}>{formatoMonto(total)}</strong>
        </span>
        <span style={{ fontSize: "0.85rem", color: "#C9D3E0" }}>
          − Proveedores <strong style={{ color: "#fff" }}>{formatoMonto(r.costosMinor)}</strong>
        </span>
        <span style={{ fontSize: "0.85rem", color: "#C9D3E0" }}>
          = Margen{" "}
          <strong style={{ color: r.margenMinor < 0 ? "#FCA5A5" : "#7EE0B0" }}>
            {formatoMonto(r.margenMinor)}
          </strong>{" "}
          · {pct(r.margenMinor, total)}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#7F93AD" }}>
          {Object.keys(PRODUCTOS).length} productos
        </span>
      </div>
    </>
  );
}
