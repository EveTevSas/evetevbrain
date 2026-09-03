import { Tarjeta, TituloSeccion } from "@/components/seccion";
import { EstadoCobro } from "@/components/estado-cobro";
import {
  ErrorApi,
  formatoMonto,
  obtenerPago,
  timelinePago,
  type EventoTimeline,
  type PagoAdmin
} from "@/lib/api/evepay";
import { ArrowLeft, BookOpen, GitCommitHorizontal, Webhook } from "lucide-react";
import Link from "next/link";
import { Reverificar } from "./reverificar";

export const dynamic = "force-dynamic";

const ORIGENES = {
  transicion: { Icono: GitCommitHorizontal, color: "#4b3075", nombre: "Transición" },
  webhook: { Icono: Webhook, color: "#1D4ED8", nombre: "Webhook" },
  ledger: { Icono: BookOpen, color: "#15803D", nombre: "Ledger" }
} as const;

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}
      >
        {etiqueta.toUpperCase()}
      </div>
      <div style={{ fontSize: "0.86rem", color: "#0A2540", marginTop: "0.15rem" }}>{children}</div>
    </div>
  );
}

/** Detalle de un evento, adaptado a lo que significa cada origen (CA-16). */
function DetalleEvento({ evento }: { evento: EventoTimeline }) {
  const d = evento.detalle;

  if (evento.origen === "transicion") {
    const actor = typeof d.actor === "string" ? d.actor : null;
    return actor ? (
      <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
        Aplicada por <strong style={{ color: "#475569" }}>{actor}</strong>
      </span>
    ) : null;
  }

  if (evento.origen === "webhook") {
    const veces = typeof d.recibidoVeces === "number" ? d.recibidoVeces : 1;
    return (
      <span style={{ fontSize: "0.75rem", color: "#64748B" }}>
        {typeof d.provider === "string" ? `${d.provider} · ` : ""}
        {veces > 1 ? (
          <strong style={{ color: "#B45309" }}>
            llegó {veces} veces (solo la primera tuvo efecto)
          </strong>
        ) : (
          "recibido una vez"
        )}
      </span>
    );
  }

  const lineas = Array.isArray(d.lineas) ? (d.lineas as Record<string, unknown>[]) : [];
  return (
    <div style={{ fontSize: "0.75rem", color: "#64748B" }}>
      {lineas.map((l, i) => (
        <div key={i} style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>
          {String(l.direccion) === "debit" ? "D" : "H"} · {String(l.cuenta)} ·{" "}
          {Number(l.montoMinor).toLocaleString("es-CO")}
        </div>
      ))}
    </div>
  );
}

export default async function DetallePagoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let pago: PagoAdmin | null = null;
  let eventos: EventoTimeline[] = [];
  let error: string | null = null;

  try {
    [pago, eventos] = await Promise.all([obtenerPago(id), timelinePago(id)]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar el cobro.";
  }

  if (error || !pago) {
    return (
      <>
        <TituloSeccion titulo="Cobro" descripcion="Detalle e historia del cobro." />
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
          <Link
            href="/pagos"
            style={{ fontSize: "0.83rem", color: "#4b3075", textDecoration: "none" }}
          >
            ← Volver al listado
          </Link>
        </Tarjeta>
      </>
    );
  }

  return (
    <>
      <Link
        href="/pagos"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          fontSize: "0.8rem",
          color: "#64748B",
          textDecoration: "none",
          marginBottom: "0.75rem"
        }}
      >
        <ArrowLeft size={14} />
        Pagos
      </Link>

      <TituloSeccion
        titulo={pago.referencia}
        descripcion={`${pago.tenantNombre} · ${formatoMonto(pago.montoMinor, pago.moneda)}`}
      />

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 1fr)" }}>
        <Tarjeta>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "1.1rem"
            }}
          >
            <Dato etiqueta="Estado">
              <EstadoCobro estado={pago.estado} />
            </Dato>
            <Dato etiqueta="Monto">{formatoMonto(pago.montoMinor, pago.moneda)}</Dato>
            <Dato etiqueta="Comercio">{pago.tenantNombre}</Dato>
            <Dato etiqueta="Proveedor">{pago.provider}</Dato>
            <Dato etiqueta="Id en el proveedor">
              <code style={{ fontSize: "0.76rem", fontFamily: "ui-monospace, Menlo, monospace" }}>
                {pago.providerPaymentId ?? "—"}
              </code>
            </Dato>
            <Dato etiqueta="Creado">{new Date(pago.creadoEn).toLocaleString("es-CO")}</Dato>
          </div>

          <div style={{ marginTop: "1.3rem" }}>
            <Reverificar paymentId={pago.id} />
          </div>
        </Tarjeta>

        <Tarjeta>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "#0A2540" }}>
            Línea de tiempo
          </h2>

          {eventos.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748B" }}>
              Este cobro todavía no tiene historia registrada.
            </p>
          ) : (
            <ol
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "1.1rem"
              }}
            >
              {eventos.map((e, i) => {
                const o = ORIGENES[e.origen];
                return (
                  <li key={`${e.momento}-${i}`} style={{ display: "flex", gap: "0.75rem" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flexShrink: 0
                      }}
                    >
                      <o.Icono size={16} color={o.color} />
                      {i < eventos.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: "#E2E8F0", marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: "0.2rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
                        <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0A2540" }}>
                          {e.titulo}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{o.nombre}</span>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#94A3B8", margin: "0.1rem 0" }}>
                        {new Date(e.momento).toLocaleString("es-CO")}
                      </div>
                      <DetalleEvento evento={e} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
