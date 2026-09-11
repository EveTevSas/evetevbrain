"use client";

import { Campo, entrada } from "@/components/campos";
import { Pencil, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { renombrarComercio } from "../acciones";

const boton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  borderRadius: 9,
  padding: "0.45rem 0.85rem",
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer"
};

/**
 * Corrección de la razón social y el nombre visible. Va aparte de "Editar
 * datos" porque son del comercio, no de su perfil: los comercios creados antes
 * de que se pidiera el perfil no lo tienen, y no deberían tener que llenarlo
 * entero para arreglar un nombre mal escrito.
 */
export function EditarNombre({
  tenantId,
  legalName,
  displayName
}: {
  tenantId: string;
  legalName: string;
  displayName: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);

    iniciar(async () => {
      const r = await renombrarComercio(tenantId, datos);
      if (r.ok) {
        setGuardado(true);
        setAbierto(false);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  if (!abierto) {
    return (
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "1.2rem" }}>
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setGuardado(false);
            setError(null);
          }}
          style={{ ...boton, background: "#fff", border: "1px solid #E2E8F0", color: "#4b3075" }}
        >
          <Pencil size={13} />
          Editar nombre
        </button>
        {guardado && (
          <span role="status" style={{ fontSize: "0.8rem", color: "#15803D", fontWeight: 600 }}>
            Nombre actualizado.
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        marginBottom: "1.2rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
        maxWidth: 620
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.9rem"
        }}
      >
        <Campo etiqueta="Razón social" requerido ayuda="Como figura en el RUT">
          <input
            name="legalName"
            defaultValue={legalName}
            required
            minLength={3}
            maxLength={200}
            autoFocus
            style={entrada}
          />
        </Campo>
        <Campo etiqueta="Nombre visible" requerido ayuda="Como se verá en la consola">
          <input
            name="displayName"
            defaultValue={displayName}
            required
            minLength={2}
            maxLength={100}
            style={entrada}
          />
        </Campo>
      </div>

      <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B" }}>
        El cambio queda en la auditoría junto con el nombre anterior.
      </p>

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 9,
            padding: "0.6rem 0.85rem",
            fontSize: "0.83rem",
            color: "#B91C1C"
          }}
        >
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          type="submit"
          disabled={pendiente}
          style={{
            ...boton,
            background: pendiente
              ? "rgba(10,37,64,0.4)"
              : "linear-gradient(135deg, #0a2540 0%, #4b3075 100%)",
            color: "#fff",
            border: "none",
            cursor: pendiente ? "not-allowed" : "pointer"
          }}
        >
          <Save size={13} />
          {pendiente ? "Guardando…" : "Guardar nombre"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={pendiente}
          style={{
            ...boton,
            background: "transparent",
            border: "1px solid #E2E8F0",
            color: "#64748B",
            fontWeight: 600
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
