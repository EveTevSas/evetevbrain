"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatoPesos } from "@/lib/format";
import { crearClienteAction } from "@/app/actions/cartera";
import { IconoError, IconoExito, IconoAlerta } from "@/components/iconos";
import type { Semaforo } from "@/lib/calc";

interface ClienteResumen {
  id: string;
  nombre: string;
  activo: boolean;
  cupo: number;
  saldo: number;
  usoCupo: number | null;
  sobreCupo: boolean;
  semaforo: Semaforo;
}

const SEMAFORO_UI: Record<Semaforo, { cls: string; texto: string; Icono: typeof IconoExito }> = {
  verde: { cls: "bg-eve-exito/10 text-eve-exito", texto: "Al día", Icono: IconoExito },
  ambar: { cls: "bg-eve-alerta/10 text-eve-alerta", texto: "31–90 días", Icono: IconoAlerta },
  rojo: { cls: "bg-eve-error/10 text-eve-error", texto: ">90 días", Icono: IconoError }
};

export default function CarteraClient({ clientes }: { clientes: ClienteResumen[] }) {
  const [nombre, setNombre] = useState("");
  const [cupo, setCupo] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [pendiente, startTransition] = useTransition();

  function crear() {
    setErrores([]);
    startTransition(async () => {
      const res = await crearClienteAction(nombre, parseFloat(cupo) || 0);
      if (res.errores.length > 0) {
        setErrores(res.errores);
      } else {
        setNombre("");
        setCupo("");
      }
    });
  }

  return (
    <div className="space-y-6">
      <h1>Cartera</h1>

      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Nuevo cliente</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="nombre" className="lbl">
              Empresa
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. ACUAEXPRESS"
              className="inp"
            />
          </div>
          <div className="sm:w-48">
            <label htmlFor="cupo" className="lbl">
              Cupo de crédito
            </label>
            <input
              id="cupo"
              type="number"
              min={0}
              step="0.01"
              value={cupo}
              onChange={(e) => setCupo(e.target.value)}
              placeholder="0.00"
              className="inp inp-num"
            />
          </div>
          {/* Único botón coral de la vista (C2): la acción principal */}
          <button
            onClick={crear}
            disabled={pendiente || !nombre.trim()}
            className="btn btn-cta shrink-0"
          >
            Crear cliente
          </button>
        </div>
        {/* Errores: ícono + texto (C5) */}
        {errores.length > 0 && (
          <ul
            role="alert"
            className="mt-3 space-y-1 rounded-[9px] bg-eve-error/10 px-3 py-2 text-sm text-eve-error"
          >
            {errores.map((e, i) => (
              <li key={i} className="flex items-center gap-2">
                <IconoError className="h-4 w-4 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        )}
      </section>

      {clientes.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-eve-pizarra">
            No hay clientes todavía. Crea el primero con el formulario de arriba.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-eve-tinte text-left text-eve-pizarra">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
                <th className="px-4 py-3 text-right font-medium">Cupo</th>
                <th className="px-4 py-3 text-right font-medium">Uso</th>
                <th className="px-4 py-3 font-medium">Mora</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const s = SEMAFORO_UI[c.semaforo];
                return (
                  <tr key={c.id} className="border-t border-eve-linea">
                    <td className="px-4 py-3 font-medium">
                      {c.nombre}
                      {!c.activo && (
                        <span className="ml-2 badge bg-eve-tinte text-eve-muted">Inactivo</span>
                      )}
                    </td>
                    {/* Cifra protagonista en Baloo 2 700 (§3) */}
                    <td className="cifra px-4 py-3 text-right">{formatoPesos(c.saldo)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-eve-pizarra">
                      {c.cupo > 0 ? formatoPesos(c.cupo) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.usoCupo !== null ? (
                        c.sobreCupo ? (
                          <span className="badge bg-eve-error/10 text-eve-error">
                            <IconoError className="h-3.5 w-3.5" />
                            {Math.round(c.usoCupo * 100)}% — sobre el cupo
                          </span>
                        ) : (
                          `${Math.round(c.usoCupo * 100)}%`
                        )
                      ) : (
                        <span className="text-eve-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.cls}`}>
                        <s.Icono className="h-3.5 w-3.5" />
                        {s.texto}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/cartera/${c.id}`} className="lnk">
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
