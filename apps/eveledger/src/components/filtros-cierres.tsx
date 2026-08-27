"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

interface Props {
  desde: string;
  hasta: string;
  estado: string;
  total: number;
  filtrados: number;
}

export default function FiltrosCierres({ desde, hasta, estado, total, filtrados }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const hayFiltros = desde || hasta || estado;

  function aplicar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    const d = fd.get("desde") as string;
    const h = fd.get("hasta") as string;
    const s = fd.get("estado") as string;
    if (d) params.set("desde", d);
    if (h) params.set("hasta", h);
    if (s) params.set("estado", s);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function limpiar() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #EDF3FA",
      borderRadius: 14,
      padding: "1rem 1.25rem",
      marginBottom: "1.25rem",
    }}>
      <form onSubmit={aplicar}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", alignItems: "flex-end" }}>

          {/* Desde */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0A2540" }}>
              Desde
            </label>
            <input
              className="inp"
              type="date"
              name="desde"
              defaultValue={desde}
              style={{ width: 160 }}
            />
          </div>

          {/* Hasta */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0A2540" }}>
              Hasta
            </label>
            <input
              className="inp"
              type="date"
              name="hasta"
              defaultValue={hasta}
              style={{ width: 160 }}
            />
          </div>

          {/* Estado */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#0A2540" }}>
              Estado
            </label>
            <select
              className="inp"
              name="estado"
              defaultValue={estado}
              style={{ width: 140 }}
            >
              <option value="">Todos</option>
              <option value="CLOSED">Cerrado</option>
              <option value="DRAFT">Borrador</option>
            </select>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="submit"
              className="btn btn-sec"
              disabled={pending}
              style={{ minHeight: 42, padding: "0 1.25rem", fontSize: "0.82rem" }}
            >
              {pending ? "Filtrando…" : "Filtrar"}
            </button>
            {hayFiltros && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={limpiar}
                disabled={pending}
                style={{ minHeight: 42, padding: "0 1.25rem", fontSize: "0.82rem" }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Contador */}
          {hayFiltros && (
            <p style={{ fontSize: "0.8rem", color: "#64748B", alignSelf: "center", marginLeft: "auto" }}>
              {filtrados} de {total} cierres
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
