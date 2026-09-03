"use client";

import { CamposPaso, PASOS, validarPaso } from "../campos-perfil";
import { guardarPerfil } from "../acciones";
import { Pencil, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";

const boton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  borderRadius: 9,
  padding: "0.6rem 1.1rem",
  fontSize: "0.83rem",
  fontWeight: 700,
  cursor: "pointer"
};

/**
 * Edición del perfil de un comercio existente.
 *
 * A diferencia del alta, aquí NO va por pasos: editando se viene a cambiar un
 * campo concreto, y obligar a recorrer cinco pantallas para corregir un
 * teléfono sería peor que el formulario largo. Se muestran todas las secciones
 * seguidas, que ya vienen agrupadas.
 */
export function EditarPerfil({
  tenantId,
  perfil,
  beneficiarios
}: {
  tenantId: string;
  perfil: Record<string, unknown> | null;
  beneficiarios: Record<string, unknown>[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [tipoPersona, setTipoPersona] = useState<string>(
    (perfil?.tipo_persona as string) ?? "juridica"
  );

  const inicial = perfil ? { ...perfil, beneficiarios } : undefined;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    // Las mismas comprobaciones del alta: editando también se puede dejar un
    // NIT sin dígito o una cuenta a medias.
    for (let i = 0; i < PASOS.length; i++) {
      const problema = validarPaso(i, form);
      if (problema) {
        setError(problema);
        return;
      }
    }
    setError(null);

    iniciar(async () => {
      const r = await guardarPerfil(tenantId, new FormData(form));
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
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => {
            setAbierto(true);
            setGuardado(false);
          }}
          style={{
            ...boton,
            background: "#fff",
            border: "1px solid #E2E8F0",
            color: "#4b3075"
          }}
        >
          <Pencil size={14} />
          {perfil ? "Editar datos" : "Completar datos"}
        </button>
        {guardado && (
          <span role="status" style={{ fontSize: "0.8rem", color: "#15803D", fontWeight: 600 }}>
            Guardado.
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={enviar}
      style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
    >
      {/* La razón social y el nombre visible son del tenant, no del perfil:
          no se editan desde aquí. */}
      {PASOS.map((_, i) => (
        <CamposPaso
          key={i}
          paso={i}
          inicial={inicial}
          tipoPersona={tipoPersona}
          onTipoPersona={setTipoPersona}
          conIdentidadDelTenant={false}
        />
      ))}

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
          <Save size={14} />
          {pendiente ? "Guardando…" : "Guardar cambios"}
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
