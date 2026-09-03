"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Comercio } from "@/lib/api/evepay";

const control: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 9,
  padding: "0.5rem 0.7rem",
  fontSize: "0.83rem",
  color: "#0A2540",
  outline: "none"
};

const ESTADOS = ["creado", "pendiente", "aprobado", "fallido", "conciliado"] as const;

/**
 * Filtros del listado (CA-15). Van en la URL y no en estado local: así un
 * listado filtrado se puede compartir o guardar, que es lo que se hace cuando
 * alguien reporta un cobro raro.
 */
export function FiltrosPagos({ comercios }: { comercios: Comercio[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const [tenantId, setTenantId] = useState(params.get("tenantId") ?? "");
  const [estado, setEstado] = useState(params.get("estado") ?? "");
  const [referencia, setReferencia] = useState(params.get("referencia") ?? "");

  function aplicar(event: FormEvent) {
    event.preventDefault();
    const q = new URLSearchParams();
    if (tenantId) q.set("tenantId", tenantId);
    if (estado) q.set("estado", estado);
    if (referencia.trim()) q.set("referencia", referencia.trim());
    router.push(`/pagos${q.toString() ? `?${q}` : ""}`);
  }

  function limpiar() {
    setTenantId("");
    setEstado("");
    setReferencia("");
    router.push("/pagos");
  }

  const hayFiltros = Boolean(tenantId || estado || referencia);

  return (
    <form
      onSubmit={aplicar}
      style={{
        display: "flex",
        gap: "0.6rem",
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: "1.25rem"
      }}
    >
      <select
        value={tenantId}
        onChange={(e) => setTenantId(e.target.value)}
        aria-label="Comercio"
        style={{ ...control, minWidth: 180 }}
      >
        <option value="">Todos los comercios</option>
        {comercios.map((c) => (
          <option key={c.tenantId} value={c.tenantId}>
            {c.displayName}
          </option>
        ))}
      </select>

      <select
        value={estado}
        onChange={(e) => setEstado(e.target.value)}
        aria-label="Estado"
        style={{ ...control, minWidth: 150 }}
      >
        <option value="">Cualquier estado</option>
        {ESTADOS.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>

      <input
        value={referencia}
        onChange={(e) => setReferencia(e.target.value)}
        placeholder="Referencia…"
        aria-label="Referencia"
        style={{ ...control, minWidth: 180 }}
      />

      <button
        type="submit"
        style={{
          ...control,
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          background: "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
          color: "#fff",
          border: "none",
          fontWeight: 700,
          cursor: "pointer"
        }}
      >
        <Search size={14} />
        Filtrar
      </button>

      {hayFiltros && (
        <button
          type="button"
          onClick={limpiar}
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
          <X size={14} />
          Limpiar
        </button>
      )}
    </form>
  );
}
