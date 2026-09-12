import { Kpi } from "@/components/kpi";
import { Aviso, Chip, PRODUCTOS, Tarjeta, TituloSeccion, Vacio } from "@/components/seccion";
import { formatoMonto, montoCorto, nombreMes, pct } from "@/lib/formato";
import { rollupDelMes } from "@/lib/hub/rollups";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GlobalPage() {
  const r = await rollupDelMes();
  const e = r.evepay;
  const barras = [
    { k: "evepay", v: r.ingresos.evepayMinor },
    { k: "eveconecta", v: r.ingresos.eveconectaMinor },
    { k: "eveledger", v: r.ingresos.eveledgerMinor }
  ] as const;
  const total = r.ingresos.totalMinor;

  const pendientes: { texto: string; href: string; tono: "rojo" | "ambar" | "azul" }[] = [];
  if (e) {
    if (e.comerciosSinTarifa > 0)
      pendientes.push({
        texto: `${e.comerciosSinTarifa} comercio(s) activos sin tarifa: no pueden cobrar`,
        href: "/productos",
        tono: "rojo"
      });
    if (e.asientosDescuadrados > 0)
      pendientes.push({
        texto: `${e.asientosDescuadrados} asiento(s) descuadrados en el ledger`,
        href: "/productos",
        tono: "rojo"
      });
    if (e.colaRiesgo > 0)
      pendientes.push({
        texto: `${e.colaRiesgo} cobro(s) retenidos por riesgo esperan revisión`,
        href: "/productos",
        tono: "ambar"
      });
    if (e.comerciosSinKyc > 0)
      pendientes.push({
        texto: `${e.comerciosSinKyc} comercio(s) sin KYC completo`,
        href: "/productos",
        tono: "ambar"
      });
    if (e.lotesAbiertos > 0)
      pendientes.push({
        texto: `${e.lotesAbiertos} lote(s) de dispersión abiertos`,
        href: "/productos",
        tono: "azul"
      });
  }
  if (!r.cierre)
    pendientes.push({
      texto: "Registrar el cierre del mes (caja y gasto operativo) para ver runway",
      href: "/salud",
      tono: "azul"
    });
  if (r.costos.length === 0)
    pendientes.push({
      texto: `Registrar los costos de proveedores de ${nombreMes(r.mes)}`,
      href: "/finanzas",
      tono: "azul"
    });

  return (
    <>
      <TituloSeccion
        titulo="Global"
        descripcion={`Toda la compañía en una vista · ${nombreMes(r.mes)}`}
      />
      {!e && (
        <Aviso tono="alerta">
          <strong>EvePay no respondió.</strong> Las cifras de procesamiento aparecen en cero hasta
          que la API vuelva; lo demás es del Hub y está al día.
        </Aviso>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "0.8rem",
          marginBottom: "1rem"
        }}
      >
        <Kpi
          etiqueta="Ingreso total (mes)"
          valor={montoCorto(total)}
          titulo={formatoMonto(total)}
          detalle="comisión EvePay + mensualidades"
        />
        <Kpi
          etiqueta="MRR (mensualidades)"
          valor={montoCorto(r.ingresos.mrrMinor)}
          titulo={formatoMonto(r.ingresos.mrrMinor)}
          detalle={`${r.mrr.eveconecta.suscriptores + r.mrr.eveledger.suscriptores} suscripción(es) activa(s)`}
        />
        <Kpi
          etiqueta="Procesamiento (comisiones)"
          valor={montoCorto(r.ingresos.evepayMinor)}
          titulo={formatoMonto(r.ingresos.evepayMinor)}
          detalle={
            e
              ? `sobre ${montoCorto(e.volumenMesMinor)} procesados · ${e.cobrosMes} cobro(s)`
              : "sin respuesta de EvePay"
          }
          tono={e ? "neutro" : "ambar"}
        />
        <Kpi
          etiqueta="Margen tras proveedores"
          valor={montoCorto(r.margenMinor)}
          titulo={formatoMonto(r.margenMinor)}
          detalle={`costos ${montoCorto(r.costosMinor)} · ${pct(r.margenMinor, total)}`}
          tono={r.margenMinor < 0 ? "rojo" : "verde"}
        />
      </div>

      <div
        style={{
          background: "linear-gradient(120deg, #0A2540, #1e3a5f)",
          color: "#fff",
          borderRadius: 16,
          padding: "1.3rem 1.4rem",
          marginBottom: "1rem"
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Ingresos por producto</div>
        <div style={{ fontSize: "0.76rem", color: "#A9B8CC", marginTop: 2 }}>
          Mezcla de mensualidad + procesamiento, este mes
        </div>
        {total > 0 ? (
          <div
            style={{
              display: "flex",
              height: 34,
              borderRadius: 8,
              overflow: "hidden",
              marginTop: "1rem"
            }}
          >
            {barras
              .filter((b) => b.v > 0)
              .map((b) => (
                <div
                  key={b.k}
                  title={`${PRODUCTOS[b.k].nombre} · ${formatoMonto(b.v)}`}
                  style={{
                    width: `${(b.v / total) * 100}%`,
                    background: PRODUCTOS[b.k].color,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#fff",
                    overflow: "hidden",
                    whiteSpace: "nowrap"
                  }}
                >
                  {b.v / total > 0.12 && `${PRODUCTOS[b.k].nombre} · ${montoCorto(b.v)}`}
                </div>
              ))}
          </div>
        ) : (
          <div style={{ marginTop: "1rem", fontSize: "0.82rem", color: "#A9B8CC" }}>
            Aún no hay ingresos registrados este mes.
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: "1.2rem",
            marginTop: "0.9rem",
            flexWrap: "wrap",
            fontSize: "0.76rem",
            color: "#C9D3E0"
          }}
        >
          {barras.map((b) => (
            <span key={b.k}>
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 9,
                  height: 9,
                  borderRadius: 3,
                  background: PRODUCTOS[b.k].color,
                  marginRight: 6,
                  verticalAlign: "middle"
                }}
              />
              {PRODUCTOS[b.k].nombre} —{" "}
              <strong style={{ color: "#fff" }}>
                {b.k === "evepay" ? "procesamiento" : "MRR"}
              </strong>
            </span>
          ))}
        </div>
        <div
          style={{
            marginTop: "0.9rem",
            paddingTop: "0.8rem",
            borderTop: "1px solid rgba(255,255,255,.12)",
            fontSize: "0.8rem",
            color: "#C9D3E0",
            display: "flex",
            gap: "1.2rem",
            flexWrap: "wrap",
            fontVariantNumeric: "tabular-nums"
          }}
        >
          <span>
            Ingresos <strong>{formatoMonto(total)}</strong>
          </span>
          <span>
            − Proveedores <strong>{formatoMonto(r.costosMinor)}</strong>
          </span>
          <span>
            = Margen{" "}
            <strong style={{ color: r.margenMinor < 0 ? "#FCA5A5" : "#7EE0B0" }}>
              {formatoMonto(r.margenMinor)}
            </strong>{" "}
            ({pct(r.margenMinor, total)})
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
          gap: "1rem"
        }}
      >
        <Tarjeta
          titulo="Productos"
          extra={
            <Link
              href="/productos"
              style={{ fontSize: "0.78rem", color: "#4b3075", fontWeight: 700 }}
            >
              Ver todos →
            </Link>
          }
        >
          <div style={{ display: "grid", gap: "0.6rem" }}>
            <Fila
              chip={
                <Chip tono="morado" punto>
                  EvePay
                </Chip>
              }
              texto={e ? `${e.comerciosActivos} comercios activos` : "sin datos"}
              valor={formatoMonto(r.ingresos.evepayMinor)}
            />
            <Fila
              chip={
                <Chip tono="azul" punto>
                  EveConecta
                </Chip>
              }
              texto={`${r.mrr.eveconecta.suscriptores} suscriptor(es)`}
              valor={formatoMonto(r.ingresos.eveconectaMinor)}
            />
            <Fila
              chip={
                <Chip tono="ok" punto>
                  EveLedger
                </Chip>
              }
              texto={`${r.mrr.eveledger.suscriptores} estación(es)`}
              valor={formatoMonto(r.ingresos.eveledgerMinor)}
            />
          </div>
        </Tarjeta>
        <Tarjeta titulo="Pendientes de la compañía">
          {pendientes.length === 0 ? (
            <Vacio>Nada urgente. Buen momento para revisar Salud financiera.</Vacio>
          ) : (
            <div style={{ display: "grid", gap: "0.55rem" }}>
              {pendientes.map((p) => (
                <Link
                  key={p.texto}
                  href={p.href}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.6rem",
                    alignItems: "center",
                    textDecoration: "none",
                    color: "#0A2540",
                    fontSize: "0.83rem",
                    padding: "0.45rem 0",
                    borderBottom: "1px solid #F1F5F9"
                  }}
                >
                  <span>{p.texto}</span>
                  <Chip tono={p.tono}>
                    {p.tono === "rojo" ? "urgente" : p.tono === "ambar" ? "revisar" : "pendiente"}
                  </Chip>
                </Link>
              ))}
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}

function Fila({ chip, texto, valor }: { chip: React.ReactNode; texto: string; valor: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.7rem",
        padding: "0.45rem 0",
        borderBottom: "1px solid #F1F5F9",
        fontSize: "0.83rem"
      }}
    >
      {chip}
      <span style={{ flex: 1, color: "#64748B" }}>{texto}</span>
      <strong style={{ fontVariantNumeric: "tabular-nums" }}>{valor}</strong>
    </div>
  );
}
