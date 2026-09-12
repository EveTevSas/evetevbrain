/** Cifra grande con etiqueta y una línea de contexto. La usan Inicio y Riesgo. */
export function Kpi({
  etiqueta,
  valor,
  detalle,
  tono = "neutro"
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: "neutro" | "rojo" | "verde" | "ambar";
}) {
  const color = { neutro: "#94A3B8", rojo: "#B91C1C", verde: "#15803D", ambar: "#B45309" }[tono];
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "1rem 1.1rem"
      }}
    >
      <div
        style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", letterSpacing: "0.04em" }}
      >
        {etiqueta.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: "1.35rem",
          fontWeight: 700,
          color: "#0A2540",
          marginTop: "0.35rem",
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
            marginTop: "0.2rem",
            fontWeight: tono === "neutro" ? 400 : 600
          }}
        >
          {detalle}
        </div>
      )}
    </div>
  );
}
