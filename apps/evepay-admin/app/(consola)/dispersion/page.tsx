import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  balancesDispersion,
  ErrorApi,
  listarLotes,
  listarRetenciones,
  type BalanceDispersionComercio,
  type Lote,
  type Retencion
} from "@/lib/api/evepay";
import { puede } from "@/lib/auth/permissions";
import { sesionActual } from "@/lib/auth/rol";
import { formatoMonto } from "@/lib/formato";
import { porcentaje } from "@/lib/tarifas";
import Link from "next/link";
import { AccionesLote } from "./acciones-lote";
import { LiberarRetencion } from "./liberar-retencion";
import { PrepararLote } from "./preparar-lote";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.65rem 0.8rem",
  fontSize: "0.82rem",
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "top"
};
const encabezado: React.CSSProperties = {
  padding: "0.55rem 0.8rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  textAlign: "left",
  borderBottom: "1px solid #E2E8F0"
};
const num: React.CSSProperties = {
  ...celda,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap"
};

function Etiqueta({
  texto,
  tono
}: {
  texto: string;
  tono: "verde" | "ambar" | "gris" | "rojo" | "azul";
}) {
  const c = {
    verde: { bg: "#F0FDF4", fg: "#15803D", bd: "#BBF7D0" },
    ambar: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
    gris: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
    rojo: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" },
    azul: { bg: "#EFF6FF", fg: "#1D4ED8", bd: "#BFDBFE" }
  }[tono];
  return (
    <span
      style={{
        display: "inline-block",
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.bd}`,
        borderRadius: 999,
        padding: "0.12rem 0.5rem",
        fontSize: "0.7rem",
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      {texto}
    </span>
  );
}

const tonoLote = {
  programado: "ambar",
  aprobado: "azul",
  pagado: "verde",
  fallido: "rojo"
} as const;

function TarjetaLote({
  lote,
  actor,
  puedeAprobar,
  puedePagar
}: {
  lote: Lote;
  actor: string;
  puedeAprobar: boolean;
  puedePagar: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
        background: "#fff"
      }}
    >
      <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: "0.95rem", color: "#0A2540" }}>{lote.tenantNombre}</strong>
        <Etiqueta texto={lote.estado} tono={tonoLote[lote.estado]} />
        <span
          style={{
            marginLeft: "auto",
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "#0A2540",
            fontVariantNumeric: "tabular-nums"
          }}
        >
          {formatoMonto(lote.montoMinor, "COP")}
        </span>
      </div>
      <div style={{ fontSize: "0.78rem", color: "#64748B", lineHeight: 1.6 }}>
        {lote.cobros} cobro(s)
        {lote.reservaMinor > 0 &&
          ` · reserva ${formatoMonto(lote.reservaMinor, "COP")} queda retenida`}{" "}
        · a {lote.cuenta.banco} {lote.cuenta.tipoCuenta}{" "}
        <code style={{ fontSize: "0.74rem" }}>{lote.cuenta.numeroCuenta}</code> (
        {lote.cuenta.titularCuenta} · {lote.cuenta.titularDocumento})
        <div>
          Preparado por {lote.preparadoPor} el {new Date(lote.preparadoEn).toLocaleString("es-CO")}
          {lote.aprobadoPor && ` · aprobado por ${lote.aprobadoPor}`}
        </div>
      </div>
      <AccionesLote lote={lote} actor={actor} puedeAprobar={puedeAprobar} puedePagar={puedePagar} />
    </div>
  );
}

export default async function DispersionPage() {
  let balances: BalanceDispersionComercio[] = [];
  let lotes: Lote[] = [];
  let retenciones: Retencion[] = [];
  let error: string | null = null;
  const { actor, rol } = await sesionActual();

  try {
    [balances, lotes, retenciones] = await Promise.all([
      balancesDispersion(),
      listarLotes(),
      listarRetenciones()
    ]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar la dispersión.";
  }

  const abiertos = lotes.filter((l) => l.estado === "programado" || l.estado === "aprobado");
  const historico = lotes.filter((l) => l.estado === "pagado" || l.estado === "fallido");
  const activas = retenciones.filter((r) => r.estado === "activa");
  const puedePreparar = puede(rol, "lotes.preparar");
  const puedeAprobar = puede(rol, "lotes.aprobar");
  const puedePagar = puede(rol, "lotes.pagar");
  const totalDisponible = balances.reduce((a, b) => a + b.disponibleMinor, 0);
  const totalRetenido = balances.reduce((a, b) => a + b.retenidoMinor, 0);

  return (
    <>
      <TituloSeccion
        titulo="Dispersión"
        descripcion="Lo que se le debe a cada comercio y ya está en la cuenta de recaudo sale en lotes: ops los prepara, finanzas los aprueba y registra el pago hecho desde el banco."
      />

      {error ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {abiertos.length > 0 && (
            <Tarjeta>
              <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
                Lotes abiertos ({abiertos.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {abiertos.map((l) => (
                  <TarjetaLote
                    key={l.id}
                    lote={l}
                    actor={actor}
                    puedeAprobar={puedeAprobar}
                    puedePagar={puedePagar}
                  />
                ))}
              </div>
            </Tarjeta>
          )}

          <Tarjeta>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "1rem",
                flexWrap: "wrap",
                marginBottom: "0.9rem"
              }}
            >
              <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>
                Balances por comercio
              </h2>
              <span style={{ fontSize: "0.78rem", color: "#64748B" }}>
                Disponible en total {formatoMonto(totalDisponible, "COP")} · retenido{" "}
                {formatoMonto(totalRetenido, "COP")}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr>
                    <th style={encabezado}>Comercio</th>
                    <th style={{ ...encabezado, textAlign: "right" }}>Disponible</th>
                    <th style={{ ...encabezado, textAlign: "right" }}>Pendiente</th>
                    <th style={{ ...encabezado, textAlign: "right" }}>Retenido</th>
                    <th style={{ ...encabezado, textAlign: "right" }}>En lote</th>
                    <th style={encabezado}>Cuenta</th>
                    <th style={{ ...encabezado, textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => {
                    const sinNada = b.disponibleMinor <= 0;
                    const motivo = b.loteAbierto
                      ? "Ya tiene un lote abierto"
                      : !b.cuentaCertificada
                        ? "Sin cuenta certificada en el perfil"
                        : sinNada
                          ? "Nada disponible todavía"
                          : undefined;
                    return (
                      <tr
                        key={b.tenantId}
                        style={{ opacity: b.tenantEstado === "activo" ? 1 : 0.6 }}
                      >
                        <td style={celda}>
                          <Link
                            href={`/comercios/${b.tenantId}`}
                            style={{ fontWeight: 700, color: "#4b3075", textDecoration: "none" }}
                          >
                            {b.tenantNombre}
                          </Link>
                          <div style={{ fontSize: "0.72rem", color: "#94A3B8" }}>
                            T+{b.diasLiquidacion}
                            {b.reservaBps > 0 && ` · reserva ${porcentaje(b.reservaBps)}`}
                            {b.primerCobroRetenido && " · primer cobro retenido"}
                          </div>
                        </td>
                        <td
                          style={{
                            ...num,
                            fontWeight: 700,
                            color: b.disponibleMinor > 0 ? "#15803D" : "#0A2540"
                          }}
                        >
                          {formatoMonto(b.disponibleMinor, "COP")}
                        </td>
                        <td style={{ ...num, color: "#64748B" }}>
                          {formatoMonto(b.pendienteMinor, "COP")}
                        </td>
                        <td style={{ ...num, color: b.retenidoMinor > 0 ? "#B45309" : "#64748B" }}>
                          {formatoMonto(b.retenidoMinor, "COP")}
                        </td>
                        <td style={{ ...num, color: "#64748B" }}>
                          {formatoMonto(b.enLoteMinor, "COP")}
                        </td>
                        <td style={celda}>
                          {b.cuentaCertificada ? (
                            <span style={{ fontSize: "0.76rem", color: "#0A2540" }}>
                              {b.cuentaDetalle}
                            </span>
                          ) : (
                            <Etiqueta
                              texto={b.cuentaDetalle ? "sin certificar" : "sin cuenta"}
                              tono="rojo"
                            />
                          )}
                        </td>
                        <td style={{ ...celda, textAlign: "right" }}>
                          {b.loteAbierto ? (
                            <Etiqueta
                              texto={`lote ${b.loteAbierto.estado}`}
                              tono={tonoLote[b.loteAbierto.estado]}
                            />
                          ) : puedePreparar ? (
                            <PrepararLote
                              tenantId={b.tenantId}
                              deshabilitado={!b.cuentaCertificada || sinNada}
                              motivo={motivo}
                            />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <Tarjeta>
            <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
              Retenciones activas ({activas.length})
            </h2>
            {activas.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>Nada retenido.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Comercio</th>
                      <th style={encabezado}>Tipo</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Monto</th>
                      <th style={encabezado}>Motivo</th>
                      <th style={encabezado}>Liberable</th>
                      <th style={{ ...encabezado, textAlign: "right" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activas.map((r) => {
                      const puedeLiberar = puede(
                        rol,
                        r.tipo === "reserva"
                          ? "retenciones.liberar_reserva"
                          : "retenciones.liberar_primer_cobro"
                      );
                      return (
                        <tr key={r.id}>
                          <td style={celda}>{r.tenantNombre}</td>
                          <td style={celda}>
                            <Etiqueta
                              texto={r.tipo === "primer_cobro" ? "primer cobro" : "reserva"}
                              tono="ambar"
                            />
                            {r.referencia && (
                              <div style={{ fontSize: "0.72rem", color: "#64748B" }}>
                                {r.referencia}
                              </div>
                            )}
                          </td>
                          <td style={{ ...num, fontWeight: 700 }}>
                            {formatoMonto(r.montoMinor, "COP")}
                          </td>
                          <td style={{ ...celda, color: "#64748B", fontSize: "0.78rem" }}>
                            {r.motivo}
                            <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>
                              {r.creadaPor} · {new Date(r.creadaEn).toLocaleDateString("es-CO")}
                            </div>
                          </td>
                          <td style={{ ...celda, fontSize: "0.78rem", color: "#64748B" }}>
                            {r.tipo === "reserva" && r.liberarDesde
                              ? `desde ${r.liberarDesde}`
                              : "cuando se revise"}
                          </td>
                          <td style={{ ...celda, textAlign: "right" }}>
                            {puedeLiberar && <LiberarRetencion id={r.id} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>

          <Tarjeta>
            <h2 style={{ margin: "0 0 0.9rem", fontSize: "0.98rem", color: "#0A2540" }}>
              Histórico de lotes
            </h2>
            {historico.length === 0 ? (
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
                Todavía no se ha pagado ningún lote.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Comercio</th>
                      <th style={encabezado}>Estado</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Monto</th>
                      <th style={encabezado}>Pago</th>
                      <th style={encabezado}>Quiénes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((l) => (
                      <tr key={l.id}>
                        <td style={celda}>{l.tenantNombre}</td>
                        <td style={celda}>
                          <Etiqueta texto={l.estado} tono={tonoLote[l.estado]} />
                          {l.falloMotivo && (
                            <div style={{ fontSize: "0.72rem", color: "#B91C1C" }}>
                              {l.falloMotivo}
                            </div>
                          )}
                        </td>
                        <td style={{ ...num, fontWeight: 700 }}>
                          {formatoMonto(l.montoMinor, "COP")}
                        </td>
                        <td style={{ ...celda, fontSize: "0.78rem", color: "#64748B" }}>
                          {l.estado === "pagado" ? (
                            <>
                              {l.fechaPago} · <code>{l.referenciaPago}</code>
                              {l.comprobante && <div>{l.comprobante}</div>}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ ...celda, fontSize: "0.74rem", color: "#94A3B8" }}>
                          preparó {l.preparadoPor}
                          {l.aprobadoPor && <div>aprobó {l.aprobadoPor}</div>}
                          {l.pagadoPor && <div>pagó {l.pagadoPor}</div>}
                          {l.fallidoPor && <div>falló {l.fallidoPor}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Tarjeta>

          <p style={{ margin: 0, fontSize: "0.75rem", color: "#94A3B8", lineHeight: 1.6 }}>
            Solo se dispersa lo conciliado que cumple los días de liquidación del comercio y a la
            cuenta certificada en su perfil. Quien prepara un lote no puede aprobarlo: lo exige la
            base, no solo esta pantalla. Cada paso queda en la auditoría.
          </p>
        </div>
      )}
    </>
  );
}
