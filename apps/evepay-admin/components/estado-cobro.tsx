/** Colores del estado de un cobro, iguales en el listado y en el detalle. */
const TONOS: Record<string, { bg: string; fg: string; bd: string }> = {
  aprobado: { bg: "#F0FDF4", fg: "#15803D", bd: "#BBF7D0" },
  conciliado: { bg: "#EEF4FF", fg: "#1D4ED8", bd: "#C7D8FF" },
  pendiente: { bg: "#FFFBEB", fg: "#B45309", bd: "#FDE68A" },
  creado: { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" },
  fallido: { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" },
  reembolsado: { bg: "#F5F3FF", fg: "#6B4BB0", bd: "#DDD6FE" },
  retenido: { bg: "#EFE9FA", fg: "#6B4BB0", bd: "#DDD6FE" }
};

export function EstadoCobro({ estado }: { estado: string }) {
  const tono = TONOS[estado] ?? TONOS.creado!;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        background: tono.bg,
        color: tono.fg,
        border: `1px solid ${tono.bd}`,
        borderRadius: 999,
        padding: "0.12rem 0.55rem",
        fontSize: "0.7rem",
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      <i style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {estado.replace("_", " ")}
    </span>
  );
}
