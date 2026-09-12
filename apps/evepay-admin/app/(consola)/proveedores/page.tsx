import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  ErrorApi,
  estadoProveedores,
  type EstadoProveedores,
  type PasoHabilitacion,
  type ProveedorInfo,
  type VariableConfig
} from "@/lib/api/evepay";
import { Check, CircleDot, Hand, Info } from "lucide-react";
import Link from "next/link";
import { PruebaSalud } from "./prueba-salud";

export const dynamic = "force-dynamic";

/** Una casilla del perfil de capacidades: etiqueta arriba, valor abajo. */
function Casilla({
  etiqueta,
  valor,
  tono
}: {
  etiqueta: string;
  valor: string;
  tono: "si" | "no" | "texto" | "vacio";
}) {
  const color = { si: "#15803D", no: "#475569", texto: "#92400E", vacio: "#B45309" }[tono];
  return (
    <div
      style={{
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "0.75rem 0.9rem",
        minWidth: 0
      }}
    >
      <div style={{ fontSize: "0.74rem", color: "#64748B", marginBottom: "0.3rem" }}>
        {etiqueta}
      </div>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color, overflowWrap: "anywhere" }}>
        {tono === "si" || tono === "no" ? (
          <>
            <span aria-hidden style={{ marginRight: "0.35rem" }}>
              ●
            </span>
            {valor}
          </>
        ) : (
          valor
        )}
      </div>
    </div>
  );
}

/** Qué tan listo está el proveedor, con los datos que la API ya reporta. */
function situacion(p: ProveedorInfo): { texto: string; bg: string; fg: string } {
  if (p.activo) return { texto: "operando", bg: "#DCFCE7", fg: "#15803D" };
  const faltaCredencial = p.configuracion.some((v) => v.requerida && !v.presente);
  const faltaPaso = p.checklist.some((c) => c.estado === "pendiente");
  if (!faltaCredencial && !faltaPaso) return { texto: "listo", bg: "#EFF6FF", fg: "#1D4ED8" };
  if (p.configuracion.some((v) => v.presente) || p.checklist.some((c) => c.estado === "listo"))
    return { texto: "onboarding", bg: "#FEF3C7", fg: "#92400E" };
  return { texto: "inactivo", bg: "#FEE2E2", fg: "#B91C1C" };
}

const NOMBRES_METODO: Record<string, string> = {
  pse: "PSE",
  tarjeta: "tarjeta",
  efectivo: "efectivo",
  billetera: "billetera",
  nequi: "Nequi",
  daviplata: "Daviplata"
};

function Paso({ paso }: { paso: PasoHabilitacion }) {
  const estilo = {
    listo: { Icono: Check, color: "#15803D" },
    pendiente: { Icono: CircleDot, color: "#B45309" },
    manual: { Icono: Hand, color: "#4b3075" }
  }[paso.estado];

  return (
    <li style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
      <estilo.Icono size={14} color={estilo.color} style={{ flexShrink: 0, marginTop: 3 }} />
      <div>
        <span style={{ fontSize: "0.82rem", color: "#0A2540" }}>{paso.descripcion}</span>
        {paso.estado === "manual" && (
          <span
            style={{
              marginLeft: "0.4rem",
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#4b3075",
              textTransform: "uppercase",
              letterSpacing: "0.03em"
            }}
          >
            verifícalo tú
          </span>
        )}
        {paso.nota && (
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "#64748B" }}>
            {paso.nota}
          </p>
        )}
      </div>
    </li>
  );
}

function Variable({ v }: { v: VariableConfig }) {
  return (
    <li style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
      {v.presente ? (
        <Check size={14} color="#15803D" style={{ flexShrink: 0, marginTop: 3 }} />
      ) : (
        <CircleDot
          size={14}
          color={v.requerida ? "#B45309" : "#94A3B8"}
          style={{ flexShrink: 0, marginTop: 3 }}
        />
      )}
      <div>
        <code
          style={{
            fontSize: "0.76rem",
            fontFamily: "ui-monospace, Menlo, monospace",
            color: "#0A2540"
          }}
        >
          {v.nombre}
        </code>
        <span style={{ marginLeft: "0.4rem", fontSize: "0.72rem", color: "#94A3B8" }}>
          {v.presente ? "configurada" : v.requerida ? "falta" : "opcional"}
        </span>
        <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#64748B" }}>{v.para}</p>
      </div>
    </li>
  );
}

function TarjetaProveedor({ p }: { p: ProveedorInfo }) {
  const est = situacion(p);
  const inicial = p.nombre.trim()[0]?.toUpperCase() ?? "?";
  const avatar = p.activo ? "#0A2540" : est.texto === "inactivo" ? "#94A3B8" : "#4b3075";
  const siNo = (b: boolean) => (b ? (["Sí", "si"] as const) : (["No", "no"] as const));
  const metodos = p.capacidades.metodos.map((m) => NOMBRES_METODO[m] ?? m).join(" · ");

  return (
    <article
      style={{
        background: "#fff",
        border: p.activo ? "1.5px solid #4b3075" : "1px solid #E2E8F0",
        boxShadow: p.activo ? "0 0 0 3px #f3eeff" : "none",
        borderRadius: 16,
        padding: "1.3rem 1.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.1rem"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", flexWrap: "wrap" }}>
        <div
          aria-hidden
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: avatar,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: "1.2rem",
            flexShrink: 0
          }}
        >
          {inicial}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ margin: 0, fontSize: "1.05rem", color: "#0A2540", fontWeight: 700 }}>
            {p.nombre}
          </h2>
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.83rem", color: "#64748B" }}>
            {p.descripcion}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <span
            style={{
              background: est.bg,
              color: est.fg,
              borderRadius: 999,
              padding: "0.25rem 0.75rem",
              fontSize: "0.76rem",
              fontWeight: 700
            }}
          >
            {est.texto}
          </span>
          <span
            role="radio"
            aria-checked={p.activo}
            aria-disabled
            title={
              p.activo
                ? "Atiende los cobros. Se define con PAYMENT_PROVIDER en el entorno de la API."
                : "Para activarlo se cambia PAYMENT_PROVIDER en el entorno de la API y se reinicia; el núcleo no se toca."
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              border: p.activo ? "1.5px solid #4b3075" : "1px solid #E2E8F0",
              background: p.activo ? "#f3eeff" : "#fff",
              color: p.activo ? "#4b3075" : "#64748B",
              borderRadius: 999,
              padding: "0.35rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "help"
            }}
          >
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: `2px solid ${p.activo ? "#4b3075" : "#94A3B8"}`,
                background: p.activo
                  ? "radial-gradient(#4b3075 45%, transparent 50%)"
                  : "transparent"
              }}
            />
            {p.activo ? "Activo" : "Activar"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.7rem"
        }}
      >
        <Casilla etiqueta="Métodos" valor={metodos || "—"} tono={metodos ? "texto" : "vacio"} />
        <Casilla
          etiqueta="Custodia"
          valor={siNo(p.capacidades.custodia)[0]}
          tono={siNo(p.capacidades.custodia)[1]}
        />
        <Casilla
          etiqueta="Payout (dispersión por API)"
          valor={siNo(p.capacidades.dispersion)[0]}
          tono={siNo(p.capacidades.dispersion)[1]}
        />
        <Casilla
          etiqueta="Reembolsos por API"
          valor={siNo(p.capacidades.reembolsos)[0]}
          tono={siNo(p.capacidades.reembolsos)[1]}
        />
        <Casilla
          etiqueta="Liquidaciones por API"
          valor={siNo(p.capacidades.liquidaciones)[0]}
          tono={siNo(p.capacidades.liquidaciones)[1]}
        />
        <Casilla
          etiqueta="Alta de comercios"
          valor={p.capacidades.altaDeComercios ? "por API" : "manual"}
          tono={p.capacidades.altaDeComercios ? "si" : "no"}
        />
      </div>

      <details style={{ borderTop: "1px solid #F1F5F9", paddingTop: "0.8rem" }}>
        <summary
          style={{
            cursor: "pointer",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#4b3075",
            listStyle: "none",
            display: "flex",
            gap: "0.6rem",
            flexWrap: "wrap"
          }}
        >
          <span>Credenciales, webhook y habilitación</span>
          <span style={{ color: "#94A3B8", fontWeight: 500 }}>
            {p.configuracion.filter((v) => v.presente).length}/{p.configuracion.length} credenciales
            · {p.checklist.filter((c) => c.estado === "listo").length}/{p.checklist.length} pasos ·
            monedas {p.capacidades.monedas.join(", ")}
          </span>
        </summary>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", marginTop: "1rem" }}>
          {p.configuracion.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#334155" }}>
                CREDENCIALES
              </h3>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem"
                }}
              >
                {p.configuracion.map((v) => (
                  <Variable key={v.nombre} v={v} />
                ))}
              </ul>
            </div>
          )}

          {p.webhook && (
            <div>
              <h3 style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", color: "#334155" }}>
                WEBHOOK
              </h3>
              <code
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "ui-monospace, Menlo, monospace",
                  color: "#0A2540",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 7,
                  padding: "0.35rem 0.55rem",
                  display: "inline-block",
                  wordBreak: "break-all"
                }}
              >
                {p.webhook}
              </code>
            </div>
          )}

          <div>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#334155" }}>
              HABILITACIÓN
            </h3>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "0.55rem"
              }}
            >
              {p.checklist.map((paso) => (
                <Paso key={paso.descripcion} paso={paso} />
              ))}
            </ul>
          </div>

          {p.activo && <PruebaSalud proveedor={p.nombre} />}
        </div>
      </details>
    </article>
  );
}

export default async function ProveedoresPage() {
  let estado: EstadoProveedores | null = null;
  let error: string | null = null;

  try {
    estado = await estadoProveedores();
  } catch (e) {
    error =
      e instanceof ErrorApi ? e.message : "No se pudo consultar el estado de los proveedores.";
  }

  return (
    <>
      <TituloSeccion
        titulo="Configuración · Proveedores de pago"
        descripcion="El núcleo habla con la interfaz PaymentProvider. Cambiar de proveedor no toca el núcleo: solo la implementación activa."
      />

      {error || !estado ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              display: "flex",
              gap: "0.7rem",
              alignItems: "flex-start",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 12,
              padding: "0.85rem 1.05rem",
              fontSize: "0.83rem",
              color: "#1E3A8A",
              lineHeight: 1.5
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0 }}>
              Cada proveedor declara su <strong>perfil de capacidades</strong>. Si el activo no
              dispersa ni reembolsa por API, EvePay lo hace con su propio riel asistido (lotes,
              reembolsos desde el banco). El día que entre otro proveedor que sí lo traiga, el mismo
              núcleo deja de hacer ese trabajo. Las tarifas de cada proveedor se manejan en{" "}
              <Link href="/tarifas" style={{ color: "#1D4ED8", fontWeight: 700 }}>
                Comisiones & Pricing
              </Link>
              .
            </p>
          </div>

          {estado.proveedores.map((p) => (
            <TarjetaProveedor key={p.nombre} p={p} />
          ))}

          <p style={{ margin: 0, fontSize: "0.75rem", color: "#94A3B8", lineHeight: 1.6 }}>
            De cada credencial se muestra si está configurada, nunca su valor: los secretos viven
            solo en el gestor del entorno. Activar otro proveedor es cambiar{" "}
            <code>PAYMENT_PROVIDER</code> allí y reiniciar la API; por eso aquí no hay un botón que
            lo haga.
          </p>
        </div>
      )}
    </>
  );
}
