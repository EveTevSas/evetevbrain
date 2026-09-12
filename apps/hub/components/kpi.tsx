export function Kpi({
  etiqueta,
  valor,
  detalle,
  tono = "neutro",
  titulo
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: "neutro" | "rojo" | "verde" | "ambar";
  titulo?: string;
}) {
  const color = { neutro: "#94A3B8", rojo: "#B91C1C", verde: "#15803D", ambar: "#B45309" }[tono];
  return (
    <div
      title={titulo}
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "1rem 1.1rem",
        boxShadow: "0 1px 2px rgba(10,37,64,.04)"
      }}
    >
      <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748B" }}>{etiqueta}</div>
      <div
        style={{
          fontSize: "1.5rem",
          fontWeight: 800,
          color: "#0A2540",
          marginTop: "0.4rem",
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {valor}
      </div>
      {detalle && (
        <div
          style={{
            fontSize: "0.74rem",
            color,
            marginTop: "0.25rem",
            fontWeight: tono === "neutro" ? 400 : 600
          }}
        >
          {detalle}
        </div>
      )}
    </div>
  );
}

export function Indicador({
  etiqueta,
  valor,
  meta,
  estado
}: {
  etiqueta: string;
  valor: string;
  meta: string;
  estado: "ok" | "alerta" | "mal" | "sin_datos";
}) {
  const c = { ok: "#15803D", alerta: "#B45309", mal: "#B91C1C", sin_datos: "#CBD5E1" }[estado];
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "0.9rem 1rem"
      }}
    >
      <div style={{ fontSize: "0.74rem", color: "#64748B", fontWeight: 600, minHeight: 30 }}>
        {etiqueta}
      </div>
      <div
        style={{
          fontSize: "1.3rem",
          fontWeight: 800,
          color: estado === "sin_datos" ? "#94A3B8" : "#0A2540",
          letterSpacing: "-0.02em"
        }}
      >
        {valor}
      </div>
      <div
        style={{
          fontSize: "0.7rem",
          color: "#94A3B8",
          marginTop: "0.45rem",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem"
        }}
      >
        <span
          aria-hidden
          style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }}
        />
        {meta}
      </div>
    </div>
  );
}
