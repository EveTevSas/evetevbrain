import type { ReactNode } from "react";

export function TituloSeccion({
  titulo,
  descripcion,
  accion
}: {
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
}) {
  return (
    <header
      style={{
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "flex-end",
        gap: "1rem",
        flexWrap: "wrap"
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.45rem",
            fontWeight: 800,
            color: "#0A2540",
            letterSpacing: "-0.01em"
          }}
        >
          {titulo}
        </h1>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.86rem", color: "#64748B" }}>{descripcion}</p>
      </div>
      {accion}
    </header>
  );
}

export function Tarjeta({
  children,
  titulo,
  extra,
  sinRelleno
}: {
  children: ReactNode;
  titulo?: string;
  extra?: ReactNode;
  sinRelleno?: boolean;
}) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        boxShadow: "0 1px 2px rgba(10,37,64,.04)"
      }}
    >
      {titulo && (
        <div
          style={{
            padding: "0.9rem 1.2rem",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            gap: "0.7rem"
          }}
        >
          <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540", flex: 1 }}>{titulo}</h2>
          {extra}
        </div>
      )}
      <div style={{ padding: sinRelleno ? 0 : "1.2rem" }}>{children}</div>
    </section>
  );
}

export function Aviso({
  children,
  tono = "info"
}: {
  children: ReactNode;
  tono?: "info" | "alerta";
}) {
  const c =
    tono === "info"
      ? { bg: "#EFF6FF", bd: "#BFDBFE", fg: "#1E3A8A" }
      : { bg: "#FFFBEB", bd: "#FDE68A", fg: "#78350F" };
  return (
    <div
      role={tono === "alerta" ? "alert" : undefined}
      style={{
        background: c.bg,
        border: `1px solid ${c.bd}`,
        color: c.fg,
        borderRadius: 12,
        padding: "0.85rem 1.05rem",
        fontSize: "0.84rem",
        lineHeight: 1.55,
        marginBottom: "1rem"
      }}
    >
      {children}
    </div>
  );
}

const TONOS = {
  ok: { bg: "#DCFCE7", fg: "#15803D" },
  ambar: { bg: "#FEF3C7", fg: "#92400E" },
  rojo: { bg: "#FEE2E2", fg: "#B91C1C" },
  azul: { bg: "#EFF6FF", fg: "#1D4ED8" },
  morado: { bg: "#F3E8FF", fg: "#4b3075" },
  gris: { bg: "#F1F5F9", fg: "#475569" }
} as const;
export type Tono = keyof typeof TONOS;

export function Chip({
  children,
  tono = "gris",
  punto
}: {
  children: ReactNode;
  tono?: Tono;
  punto?: boolean;
}) {
  const c = TONOS[tono];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        background: c.bg,
        color: c.fg,
        borderRadius: 999,
        padding: "0.18rem 0.65rem",
        fontSize: "0.73rem",
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      {punto && (
        <span
          aria-hidden
          style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}

export const PRODUCTOS = {
  evepay: {
    nombre: "EvePay",
    color: "#4b3075",
    tono: "morado" as Tono,
    rol: "Plataforma de pagos · el núcleo que vendemos"
  },
  eveconecta: {
    nombre: "EveConecta",
    color: "#1D4ED8",
    tono: "azul" as Tono,
    rol: "Propiedad horizontal · mensualidad + cobros vía EvePay"
  },
  eveledger: {
    nombre: "EveLedger",
    color: "#15803D",
    tono: "ok" as Tono,
    rol: "Estaciones de servicio · mensualidad + procesamiento"
  }
} as const;

export function Vacio({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748B" }}>{children}</p>;
}

export const celda: React.CSSProperties = {
  padding: "0.7rem 0.9rem",
  fontSize: "0.82rem",
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "middle"
};
export const encabezado: React.CSSProperties = {
  padding: "0.6rem 0.9rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  textAlign: "left",
  borderBottom: "1px solid #E2E8F0",
  background: "#FAFAF8",
  whiteSpace: "nowrap"
};
