"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Comercio } from "@/lib/api/evepay";

const control: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: "0.5rem 0.75rem",
  fontSize: "0.83rem",
  color: "#0A2540",
  outline: "none"
};

/** Los estados de la máquina, en el orden en que un cobro los recorre; «retenidas» es un corte transversal. */
const CHIPS = [
  ["", "Todas"],
  ["aprobado", "Aprobadas"],
  ["pendiente", "Pendientes"],
  ["fallido", "Fallidas"],
  ["conciliado", "Conciliadas"],
  ["reembolsado", "Reembolsadas"],
  ["retenidas", "Retenidas"]
] as const;

/**
 * Filtros del listado (CA-15). Van en la URL y no en estado local: así un
 * listado filtrado se puede compartir o guardar, que es lo que se hace cuando
 * alguien reporta un cobro raro.
 */
export function FiltrosPagos({ comercios }: { comercios: Comercio[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const estado = params.get("estado") ?? "";
  const [tenantId, setTenantId] = useState(params.get("tenantId") ?? "");
  const [referencia, setReferencia] = useState(params.get("referencia") ?? "");

  function conEstado(e: string): string {
    const q = new URLSearchParams(params.toString());
    q.delete("cursorAt");
    q.delete("cursorId");
    if (e) q.set("estado", e);
    else q.delete("estado");
    return `/pagos${q.toString() ? `?${q}` : ""}`;
  }

  function aplicar(event: FormEvent) {
    event.preventDefault();
    const q = new URLSearchParams();
    if (tenantId) q.set("tenantId", tenantId);
    if (estado) q.set("estado", estado);
    if (referencia.trim()) q.set("referencia", referencia.trim());
    router.push(`/pagos${q.toString() ? `?${q}` : ""}`);
  }

  const hayFiltros = Boolean(tenantId || estado || referencia);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "1.1rem" }}
    >
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {CHIPS.map(([valor, texto]) => {
          const on = estado === valor;
          return (
            <Link
              key={valor}
              href={conEstado(valor)}
              style={{
                border: `1px solid ${on ? "#0A2540" : "#E2E8F0"}`,
                background: on ? "#0A2540" : "#fff",
                color: on ? "#fff" : "#475569",
                borderRadius: 999,
                padding: "0.4rem 0.95rem",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              {texto}
            </Link>
          );
        })}
      </div>
      <form
        onSubmit={aplicar}
        style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}
      >
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          aria-label="Comercio"
          style={{ ...control, minWidth: 200 }}
        >
          <option value="">Todos los comercios</option>
          {comercios.map((c) => (
            <option key={c.tenantId} value={c.tenantId}>
              {c.displayName}
            </option>
          ))}
        </select>
        <input
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          placeholder="Referencia del cobro…"
          aria-label="Referencia"
          style={{ ...control, minWidth: 220 }}
        />
        <button
          type="submit"
          style={{
            ...control,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "#0A2540",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          <Search size={14} /> Buscar
        </button>
        {hayFiltros && (
          <button
            type="button"
            onClick={() => {
              setTenantId("");
              setReferencia("");
              router.push("/pagos");
            }}
            style={{
              ...control,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              color: "#64748B",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <X size={14} /> Limpiar
          </button>
        )}
      </form>
    </div>
  );
}
