"use client";

import { useState, useTransition } from "react";
import {
  crearProducto,
  renombrarProducto,
  eliminarProducto,
  crearManguera,
  renombrarManguera,
  cambiarEstadoManguera,
  eliminarManguera
} from "@/app/actions/config";
import { IconoError } from "@/components/iconos";

interface Manguera {
  id: string;
  nombre: string;
  activa: boolean;
  lecturas: number;
}

interface Producto {
  id: string;
  nombre: string;
  mangueras: Manguera[];
}

export default function ConfigClient({ productos }: { productos: Producto[] }) {
  const [errores, setErrores] = useState<string[]>([]);
  const [pendiente, startTransition] = useTransition();
  const [nuevoProducto, setNuevoProducto] = useState("");
  const [nuevaManguera, setNuevaManguera] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<Record<string, string>>({});

  function ejecutar(accion: Promise<{ errores: string[] }>) {
    setErrores([]);
    startTransition(async () => {
      const res = await accion;
      if (res.errores.length > 0) setErrores(res.errores);
    });
  }

  function campoEdicion(id: string, actual: string) {
    return editando[id] ?? actual;
  }

  return (
    <div className="space-y-6">
      <h1>Configuración</h1>

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

      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Nuevo producto</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={nuevoProducto}
            onChange={(e) => setNuevoProducto(e.target.value)}
            placeholder="Ej. Corriente, ACPM, Extra"
            aria-label="Nombre del nuevo producto"
            className="inp sm:max-w-xs"
          />
          {/* Acción secundaria: en esta vista no hay CTA coral */}
          <button
            disabled={pendiente || !nuevoProducto.trim()}
            onClick={() =>
              ejecutar(
                crearProducto(nuevoProducto).then((r) => {
                  if (r.errores.length === 0) setNuevoProducto("");
                  return r;
                })
              )
            }
            className="btn btn-sec"
          >
            Crear
          </button>
        </div>
      </section>

      {productos.map((p) => (
        <section key={p.id} className="card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={campoEdicion(p.id, p.nombre)}
              onChange={(e) => setEditando({ ...editando, [p.id]: e.target.value })}
              aria-label={`Nombre del producto ${p.nombre}`}
              className="inp max-w-56 font-semibold"
            />
            <button
              disabled={pendiente}
              onClick={() => ejecutar(renombrarProducto(p.id, campoEdicion(p.id, p.nombre)))}
              className="btn btn-ghost"
            >
              Renombrar
            </button>
            <button
              disabled={pendiente}
              onClick={() => ejecutar(eliminarProducto(p.id))}
              className="lnk-peligro text-sm"
            >
              Eliminar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-eve-tinte text-left text-eve-pizarra">
                <tr>
                  <th className="px-2 py-2 font-medium">Manguera</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {p.mangueras.map((m) => (
                  <tr key={m.id} className="border-t border-eve-linea">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={campoEdicion(m.id, m.nombre)}
                        onChange={(e) => setEditando({ ...editando, [m.id]: e.target.value })}
                        aria-label={`Nombre de la manguera ${m.nombre}`}
                        className="inp max-w-56"
                      />
                    </td>
                    <td className="px-2 py-2">
                      {m.activa ? (
                        <span className="badge bg-eve-exito/10 text-eve-exito">Activa</span>
                      ) : (
                        <span className="badge bg-eve-tinte text-eve-pizarra">Inactiva</span>
                      )}
                    </td>
                    <td className="space-x-3 px-2 py-2 text-right whitespace-nowrap">
                      <button
                        disabled={pendiente}
                        onClick={() =>
                          ejecutar(renombrarManguera(m.id, campoEdicion(m.id, m.nombre)))
                        }
                        className="lnk"
                      >
                        Renombrar
                      </button>
                      <button
                        disabled={pendiente}
                        onClick={() => ejecutar(cambiarEstadoManguera(m.id, !m.activa))}
                        className="lnk"
                      >
                        {m.activa ? "Desactivar" : "Activar"}
                      </button>
                      {m.lecturas === 0 && (
                        <button
                          disabled={pendiente}
                          onClick={() => ejecutar(eliminarManguera(m.id))}
                          className="lnk-peligro"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-eve-linea bg-eve-tinte">
                  <td className="px-2 py-2" colSpan={2}>
                    <input
                      type="text"
                      value={nuevaManguera[p.id] ?? ""}
                      onChange={(e) =>
                        setNuevaManguera({ ...nuevaManguera, [p.id]: e.target.value })
                      }
                      placeholder="Nueva manguera..."
                      aria-label={`Nueva manguera para ${p.nombre}`}
                      className="inp max-w-56"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      disabled={pendiente || !(nuevaManguera[p.id] ?? "").trim()}
                      onClick={() =>
                        ejecutar(
                          crearManguera(nuevaManguera[p.id] ?? "", p.id).then((r) => {
                            if (r.errores.length === 0)
                              setNuevaManguera({ ...nuevaManguera, [p.id]: "" });
                            return r;
                          })
                        )
                      }
                      className="btn btn-sec"
                    >
                      Agregar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
