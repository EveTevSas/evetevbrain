"use client";

import { Campo, entrada } from "@/components/campos";
import type { CoincidenciaRestrictiva, EntradaListaRestrictiva } from "@/lib/api/evepay";
import { Plus, Search, ShieldOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { agregarALista, desactivarDeLista, verificarDocumento } from "./acciones";

const celda: React.CSSProperties = {
  padding: "0.55rem 0.7rem",
  fontSize: "0.8rem",
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "top"
};
const boton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  border: "1px solid #E2E8F0",
  background: "#fff",
  borderRadius: 9,
  padding: "0.4rem 0.75rem",
  fontSize: "0.76rem",
  fontWeight: 700,
  color: "#4b3075",
  cursor: "pointer"
};

export function ListaRestrictiva({
  entradas,
  puedeEditar
}: {
  entradas: EntradaListaRestrictiva[];
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CoincidenciaRestrictiva[] | null>(null);

  function agregar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    iniciar(async () => {
      const r = await agregarALista(datos);
      if (r.ok) {
        setAgregando(false);
        router.refresh();
      } else setError(r.error);
    });
  }

  function verificar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    iniciar(async () => {
      const r = await verificarDocumento(datos);
      if (r.ok) setResultado(r.datos);
      else setError(r.error);
    });
  }

  const activas = entradas.filter((e) => e.activa);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>
            Lista restrictiva (SARLAFT)
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#64748B" }}>
            {activas.length} documento(s) activos. Se cruzan en cada alta: comercio, representante
            legal y beneficiarios. Una coincidencia bloquea el alta.
          </p>
        </div>
        {puedeEditar && !agregando && (
          <button type="button" onClick={() => setAgregando(true)} style={boton}>
            <Plus size={13} /> Agregar documento
          </button>
        )}
      </div>

      {agregando && (
        <form
          onSubmit={agregar}
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 12,
            padding: "1rem 1.1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.8rem"
            }}
          >
            <Campo etiqueta="Tipo" requerido>
              <select name="tipoDocumento" defaultValue="NIT" style={entrada}>
                <option>NIT</option>
                <option>CC</option>
                <option>CE</option>
                <option>PA</option>
              </select>
            </Campo>
            <Campo etiqueta="Número" requerido>
              <input name="numeroDocumento" required minLength={3} autoFocus style={entrada} />
            </Campo>
            <Campo etiqueta="Nombre" requerido>
              <input name="nombre" required minLength={2} style={entrada} />
            </Campo>
            <Campo etiqueta="Fuente" requerido>
              <select name="fuente" defaultValue="interna" style={entrada}>
                <option value="OFAC">OFAC</option>
                <option value="ONU">ONU</option>
                <option value="PEP">PEP</option>
                <option value="interna">interna</option>
              </select>
            </Campo>
            <Campo etiqueta="Motivo" ayuda="Opcional">
              <input name="motivo" maxLength={500} style={entrada} />
            </Campo>
          </div>
          {error && (
            <p role="alert" style={{ margin: 0, fontSize: "0.8rem", color: "#B91C1C" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="submit"
              disabled={pendiente}
              style={{ ...boton, background: "#0A2540", color: "#fff", border: "none" }}
            >
              <Plus size={13} /> {pendiente ? "Guardando…" : "Agregar"}
            </button>
            <button
              type="button"
              onClick={() => setAgregando(false)}
              style={{ ...boton, color: "#64748B" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <form
        onSubmit={verificar}
        style={{
          display: "flex",
          gap: "0.6rem",
          alignItems: "flex-end",
          flexWrap: "wrap",
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "0.8rem 0.9rem"
        }}
      >
        <Campo etiqueta="Verificar un documento">
          <select name="tipoDocumento" defaultValue="NIT" style={{ ...entrada, width: 90 }}>
            <option>NIT</option>
            <option>CC</option>
            <option>CE</option>
            <option>PA</option>
          </select>
        </Campo>
        <Campo etiqueta="Número">
          <input name="numeroDocumento" required minLength={3} style={{ ...entrada, width: 200 }} />
        </Campo>
        <button type="submit" disabled={pendiente} style={boton}>
          <Search size={13} /> Verificar
        </button>
        {resultado && (
          <span
            role="status"
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: resultado.length ? "#B91C1C" : "#15803D"
            }}
          >
            {resultado.length
              ? `Coincide: ${resultado.map((c) => `${c.fuente} · ${c.nombre}`).join("; ")}`
              : "Sin coincidencias."}
          </span>
        )}
      </form>

      {entradas.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
            <tbody>
              {entradas.map((e) => (
                <tr key={e.id} style={{ opacity: e.activa ? 1 : 0.5 }}>
                  <td style={celda}>
                    <strong>
                      {e.tipoDocumento} {e.numeroDocumento}
                    </strong>
                    <div style={{ color: "#64748B" }}>{e.nombre}</div>
                  </td>
                  <td style={celda}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#B91C1C" }}>
                      {e.fuente}
                    </span>
                    {e.motivo && (
                      <div style={{ fontSize: "0.72rem", color: "#64748B" }}>{e.motivo}</div>
                    )}
                  </td>
                  <td style={{ ...celda, fontSize: "0.72rem", color: "#94A3B8" }}>
                    {e.agregadaPor} · {new Date(e.agregadaEn).toLocaleDateString("es-CO")}
                    {!e.activa && " · inactiva"}
                  </td>
                  <td style={{ ...celda, textAlign: "right" }}>
                    {e.activa && puedeEditar && (
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() =>
                          iniciar(async () => {
                            const r = await desactivarDeLista(e.id);
                            if (r.ok) router.refresh();
                            else setError(r.error);
                          })
                        }
                        style={{ ...boton, color: "#64748B" }}
                      >
                        <ShieldOff size={12} /> Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
