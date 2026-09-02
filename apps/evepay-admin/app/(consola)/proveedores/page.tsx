import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  ErrorApi,
  estadoProveedores,
  type EstadoProveedores,
  type PasoHabilitacion,
  type ProveedorInfo,
  type VariableConfig
} from "@/lib/api/evepay";
import { Check, CircleDot, Hand, Minus } from "lucide-react";
import { PruebaSalud } from "./prueba-salud";

export const dynamic = "force-dynamic";

function Capacidad({ etiqueta, tiene }: { etiqueta: string; tiene: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        fontSize: "0.76rem",
        color: tiene ? "#15803D" : "#94A3B8"
      }}
    >
      {tiene ? <Check size={13} /> : <Minus size={13} />}
      {etiqueta}
    </span>
  );
}

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
  return (
    <div
      style={{
        background: "#fff",
        border: p.activo ? "1.5px solid #4b3075" : "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "1.4rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.1rem"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem", color: "#0A2540", fontWeight: 700 }}>
          {p.nombre}
        </h2>
        {p.activo && (
          <span
            style={{
              background: "#f3eeff",
              color: "#4b3075",
              border: "1px solid #ddd0ff",
              borderRadius: 999,
              padding: "0.14rem 0.6rem",
              fontSize: "0.7rem",
              fontWeight: 700
            }}
          >
            atiende los cobros
          </span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: "0.83rem", color: "#64748B", lineHeight: 1.5 }}>
        {p.descripcion}
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Capacidad etiqueta="Alta de comercios por API" tiene={p.capacidades.altaDeComercios} />
        <Capacidad etiqueta="Liquidaciones por API" tiene={p.capacidades.liquidaciones} />
        <span style={{ fontSize: "0.76rem", color: "#64748B" }}>
          Monedas: {p.capacidades.monedas.join(", ")}
        </span>
      </div>

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
          <h3 style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", color: "#334155" }}>WEBHOOK</h3>
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
        titulo="Proveedores de pago"
        descripcion="La adquirencia detrás de PaymentProvider: quién está activo y en qué estado."
      />

      {error || !estado ? (
        <Tarjeta>
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
        </Tarjeta>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {estado.proveedores.map((p) => (
              <TarjetaProveedor key={p.nombre} p={p} />
            ))}
          </div>

          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#94A3B8", lineHeight: 1.6 }}>
            De cada credencial se muestra si está configurada, nunca su valor: los secretos viven
            solo en el gestor del entorno. Cambiar de proveedor es cambiar PAYMENT_PROVIDER allí; el
            núcleo de pagos no se toca.
          </p>
        </>
      )}
    </>
  );
}
