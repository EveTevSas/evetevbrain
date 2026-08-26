"use client";

import { useState, useTransition } from "react";
import { crearCierreAction } from "@/app/actions/cierres";
import { hoyInput } from "@/lib/format";
import { IconoError } from "@/components/iconos";

export default function NuevoCierrePage() {
  const [fecha, setFecha] = useState(hoyInput());
  const [errores, setErrores] = useState<string[]>([]);
  const [pendiente, startTransition] = useTransition();

  function crear() {
    startTransition(async () => {
      const res = await crearCierreAction(fecha);
      // Si no hubo redirect, mostrar errores (ej. fecha duplicada).
      if (res && res.errores) setErrores(res.errores);
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1>Nuevo cierre diario</h1>
      <div className="card space-y-4 p-6">
        <div>
          <label htmlFor="fecha" className="lbl">
            Fecha del cierre
          </label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="inp"
          />
          <p className="mt-2 text-xs text-eve-pizarra">
            Las lecturas iniciales se arrastran automáticamente del último cierre anterior. No se
            permiten dos cierres para la misma fecha.
          </p>
        </div>
        {/* Errores: ícono + texto (C5) */}
        {errores.length > 0 && (
          <ul
            role="alert"
            className="space-y-1 rounded-[9px] bg-eve-error/10 px-3 py-2 text-sm text-eve-error"
          >
            {errores.map((e, i) => (
              <li key={i} className="flex items-center gap-2">
                <IconoError className="h-4 w-4 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        )}
        {/* Único botón coral de la vista (C2) */}
        <button onClick={crear} disabled={pendiente || !fecha} className="btn btn-cta w-full">
          {pendiente ? "Creando..." : "Crear cierre"}
        </button>
      </div>
    </div>
  );
}
