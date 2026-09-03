import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  ErrorApi,
  formatoMonto,
  historicoConciliacion,
  ledgerDeComercio,
  listarComercios,
  type Comercio,
  type CorridaConciliacion,
  type LedgerTenant
} from "@/lib/api/evepay";
import { CircleAlert, CircleCheck, Hand } from "lucide-react";
import Link from "next/link";
import { CorrerConciliacion } from "./correr";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.65rem 0.85rem",
  fontSize: "0.82rem",
  borderBottom: "1px solid #F1F5F9"
};

const encabezado: React.CSSProperties = {
  padding: "0.55rem 0.85rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  textAlign: "left",
  borderBottom: "1px solid #E2E8F0"
};

function Historico({ corridas }: { corridas: CorridaConciliacion[] }) {
  if (corridas.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
        Todavía no se ha conciliado ningún periodo.
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr>
            <th style={encabezado}>Comercio</th>
            <th style={encabezado}>Periodo</th>
            <th style={encabezado}>Resultado</th>
            <th style={encabezado}>Corrida</th>
          </tr>
        </thead>
        <tbody>
          {corridas.map((c) => (
            <tr key={c.id}>
              <td style={celda}>{c.tenantNombre}</td>
              <td style={{ ...celda, fontSize: "0.78rem", color: "#64748B" }}>
                {c.desde.slice(0, 10)} → {c.hasta.slice(0, 10)}
              </td>
              <td style={celda}>
                {c.modo === "no_soportada" ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      color: "#B45309",
                      fontWeight: 600,
                      fontSize: "0.78rem"
                    }}
                  >
                    <Hand size={13} />
                    manual — {c.provider} no liquida por API
                  </span>
                ) : (
                  <span style={{ fontSize: "0.8rem" }}>
                    {c.conciliados} conciliados
                    {(c.diferencias ?? 0) > 0 && (
                      <strong style={{ color: "#B91C1C" }}>
                        {" "}
                        · {c.diferencias} con diferencia
                      </strong>
                    )}
                    {(c.noConciliados ?? 0) > 0 && (
                      <span style={{ color: "#B45309" }}> · {c.noConciliados} sin liquidar</span>
                    )}
                  </span>
                )}
              </td>
              <td style={{ ...celda, fontSize: "0.76rem", color: "#94A3B8" }}>
                {new Date(c.corridoEn).toLocaleString("es-CO")}
                <div>{c.actor}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LedgerComercio({ comercio, ledger }: { comercio: Comercio; ledger: LedgerTenant }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          marginBottom: "0.6rem",
          flexWrap: "wrap"
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.9rem", color: "#0A2540", fontWeight: 700 }}>
          {comercio.displayName}
        </h3>
        {ledger.cuadra ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#15803D"
            }}
          >
            <CircleCheck size={13} /> partida doble cuadrada
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#B91C1C",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 999,
              padding: "0.15rem 0.55rem"
            }}
          >
            <CircleAlert size={13} /> DESCUADRE: débitos{" "}
            {ledger.totalDebitos.toLocaleString("es-CO")} ≠ créditos{" "}
            {ledger.totalCreditos.toLocaleString("es-CO")}
          </span>
        )}
      </div>

      {ledger.saldos.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#94A3B8" }}>Sin movimientos todavía.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr>
                <th style={encabezado}>Cuenta</th>
                <th style={{ ...encabezado, textAlign: "right" }}>Débitos</th>
                <th style={{ ...encabezado, textAlign: "right" }}>Créditos</th>
                <th style={{ ...encabezado, textAlign: "right" }}>Saldo</th>
                <th style={{ ...encabezado, textAlign: "right" }}>Movs.</th>
              </tr>
            </thead>
            <tbody>
              {ledger.saldos.map((s) => (
                <tr key={s.cuenta}>
                  <td
                    style={{
                      ...celda,
                      fontFamily: "ui-monospace, Menlo, monospace",
                      fontSize: "0.76rem"
                    }}
                  >
                    {s.cuenta}
                  </td>
                  <td style={{ ...celda, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {s.debitos.toLocaleString("es-CO")}
                  </td>
                  <td style={{ ...celda, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {s.creditos.toLocaleString("es-CO")}
                  </td>
                  <td
                    style={{
                      ...celda,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      color: s.saldoMinor < 0 ? "#B45309" : "#0A2540"
                    }}
                  >
                    {formatoMonto(s.saldoMinor, "COP")}
                  </td>
                  <td style={{ ...celda, textAlign: "right", color: "#94A3B8" }}>
                    {s.movimientos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ledger.asientosDescuadrados.length > 0 && (
        <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: "#B91C1C" }}>
          Asientos que no cuadran por sí solos: {ledger.asientosDescuadrados.join(", ")}
        </p>
      )}
    </div>
  );
}

export default async function ConciliacionPage() {
  let comercios: Comercio[] = [];
  let corridas: CorridaConciliacion[] = [];
  let ledgers: { comercio: Comercio; ledger: LedgerTenant }[] = [];
  let error: string | null = null;

  try {
    [comercios, corridas] = await Promise.all([listarComercios(), historicoConciliacion()]);
    // Solo los comercios activos: el ledger de uno desactivado sigue
    // consultable desde su propia ficha, pero no satura esta vista.
    const activos = comercios.filter((c) => c.estado === "activo").slice(0, 10);
    ledgers = await Promise.all(
      activos.map(async (comercio) => ({
        comercio,
        ledger: await ledgerDeComercio(comercio.tenantId)
      }))
    );
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar la conciliación.";
  }

  const conDescuadre = ledgers.filter(({ ledger }) => !ledger.cuadra);

  return (
    <>
      <TituloSeccion
        titulo="Conciliación y ledger"
        descripcion="Lo cobrado cuadra con lo liquidado, y cada peso es reconstruible."
      />

      {error ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <>
          {conDescuadre.length > 0 && (
            <div
              role="alert"
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: 12,
                padding: "0.9rem 1.1rem",
                marginBottom: "1.25rem",
                display: "flex",
                gap: "0.55rem",
                alignItems: "flex-start"
              }}
            >
              <CircleAlert size={17} color="#B91C1C" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#B91C1C" }}>
                  {conDescuadre.length} comercio(s) con la partida doble descuadrada
                </p>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#7F1D1D" }}>
                  Un ledger descuadrado significa que hay un asiento mal construido. Revísalo antes
                  de que ese número llegue a un estado de cuenta:{" "}
                  {conDescuadre.map((d) => d.comercio.displayName).join(", ")}.
                </p>
              </div>
            </div>
          )}

          <CorrerConciliacion comercios={comercios.filter((c) => c.estado === "activo")} />

          <Tarjeta>
            <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
              Histórico de corridas
            </h2>
            <Historico corridas={corridas} />
          </Tarjeta>

          <div style={{ marginTop: "1rem" }}>
            <Tarjeta>
              <h2 style={{ margin: "0 0 1rem", fontSize: "0.98rem", color: "#0A2540" }}>
                Ledger por comercio
              </h2>
              {ledgers.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
                  No hay comercios activos.
                </p>
              ) : (
                ledgers.map(({ comercio, ledger }) => (
                  <LedgerComercio key={comercio.tenantId} comercio={comercio} ledger={ledger} />
                ))
              )}
            </Tarjeta>
          </div>

          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#94A3B8", lineHeight: 1.6 }}>
            El saldo se reconstruye sumando las líneas de cada asiento; no hay ningún campo
            &ldquo;saldo&rdquo; guardado que pudiera quedar desactualizado. Las corridas de
            conciliación son inmutables: registran qué se sabía y cuándo. Ver{" "}
            <Link href="/pagos" style={{ color: "#4b3075" }}>
              los cobros
            </Link>{" "}
            para el detalle de cada movimiento.
          </p>
        </>
      )}
    </>
  );
}
