"use client";

import { useState, useTransition } from "react";
import { formatoPesos, formatoFecha, hoyInput } from "@/lib/format";
import {
  actualizarClienteAction,
  generarFacturaAction,
  registrarAbonoAction
} from "@/app/actions/cartera";
import { IconoError, IconoExito, IconoAlerta } from "@/components/iconos";
import type { RangoAging, Semaforo } from "@/lib/calc";

interface ClienteDetalleData {
  id: string;
  nombre: string;
  activo: boolean;
  cupo: number;
  saldo: number;
  usoCupo: number | null;
  sobreCupo: boolean;
  valesSinFacturar: { id: string; fecha: Date; cerrado: boolean; valor: number }[];
  facturas: {
    id: string;
    fechaEmision: Date;
    total: number;
    abonado: number;
    pendiente: number;
    dias: number;
    rango: RangoAging;
    semaforo: Semaforo;
  }[];
  abonos: { id: string; fecha: Date; valor: number; detalle: string }[];
}

const SEMAFORO_UI: Record<Semaforo, { cls: string; Icono: typeof IconoExito }> = {
  verde: { cls: "bg-eve-exito/10 text-eve-exito", Icono: IconoExito },
  ambar: { cls: "bg-eve-alerta/10 text-eve-alerta", Icono: IconoAlerta },
  rojo: { cls: "bg-eve-error/10 text-eve-error", Icono: IconoError }
};

const thCls = "px-3 py-2 font-medium text-eve-pizarra";
const tdCls = "border-t border-eve-linea px-3 py-2";
const tdNum = `${tdCls} text-right tabular-nums`;

export default function ClienteDetalle({ cliente }: { cliente: ClienteDetalleData }) {
  const [nombre, setNombre] = useState(cliente.nombre);
  const [cupo, setCupo] = useState(String(cliente.cupo));
  const [activo, setActivo] = useState(cliente.activo);
  const [fechaAbono, setFechaAbono] = useState(hoyInput());
  const [valorAbono, setValorAbono] = useState("");
  const [detalleAbono, setDetalleAbono] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [pendiente, startTransition] = useTransition();

  const facturables = cliente.valesSinFacturar.filter((v) => v.cerrado);
  const totalFacturable = facturables.reduce((acc, v) => acc + v.valor, 0);

  function ejecutar(accion: Promise<{ errores: string[] }>, ok?: string, limpiar?: () => void) {
    setErrores([]);
    setMensaje("");
    startTransition(async () => {
      const res = await accion;
      if (res.errores.length > 0) {
        setErrores(res.errores);
      } else {
        if (ok) setMensaje(ok);
        limpiar?.();
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>{cliente.nombre}</h1>
          <p className="text-sm text-eve-pizarra">
            {cliente.activo ? "Cliente activo" : "Cliente inactivo"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-eve-pizarra">Saldo actual</p>
          {/* Cifra protagonista en Baloo 2 700 (§3) */}
          <p className="cifra text-2xl">{formatoPesos(cliente.saldo)}</p>
        </div>
      </div>

      {cliente.sobreCupo && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-[9px] bg-eve-error/10 px-3 py-2 text-sm text-eve-error"
        >
          <IconoError className="h-4 w-4 shrink-0" />
          El saldo supera el cupo de crédito ({formatoPesos(cliente.cupo)}).
        </p>
      )}

      {/* Errores y mensajes de las acciones: ícono + texto (C5) */}
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
      {mensaje && (
        <p className="flex items-center gap-2 rounded-[9px] bg-eve-exito/10 px-3 py-2 text-sm text-eve-exito">
          <IconoExito className="h-4 w-4 shrink-0" />
          {mensaje}
        </p>
      )}

      {/* Datos del cliente */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Datos del cliente</h2>
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
              className="inp inp-num"
            />
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="h-[17px] w-[17px] accent-eve-electrico"
            />
            Activo
          </label>
          {/* Acción secundaria (mezclado): el CTA coral de la vista es Generar factura */}
          <button
            onClick={() =>
              ejecutar(
                actualizarClienteAction(cliente.id, {
                  nombre,
                  cupo: parseFloat(cupo) || 0,
                  activo
                }),
                "Datos actualizados."
              )
            }
            disabled={pendiente || !nombre.trim()}
            className="btn btn-sec shrink-0"
          >
            Guardar cambios
          </button>
        </div>
      </section>

      {/* Vales sin facturar */}
      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2>Vales sin facturar</h2>
          {/* Único botón coral de la vista (C2): la acción principal */}
          <button
            onClick={() =>
              ejecutar(
                generarFacturaAction(cliente.id),
                "Factura generada con los vales del corte."
              )
            }
            disabled={pendiente || facturables.length === 0}
            title={
              facturables.length === 0
                ? "No hay vales de cierres cerrados por facturar"
                : `Factura ${formatoPesos(totalFacturable)}`
            }
            className="btn btn-cta"
          >
            Generar factura
          </button>
        </div>
        {cliente.valesSinFacturar.length === 0 ? (
          <p className="text-sm text-eve-pizarra">Sin vales pendientes de facturar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-eve-tinte text-left">
                <tr>
                  <th className={thCls}>Fecha del cierre</th>
                  <th className={thCls}>Estado</th>
                  <th className={`${thCls} text-right`}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {cliente.valesSinFacturar.map((v) => (
                  <tr key={v.id}>
                    <td className={tdCls}>{formatoFecha(v.fecha)}</td>
                    <td className={tdCls}>
                      {v.cerrado ? (
                        <span className="badge bg-eve-exito/10 text-eve-exito">
                          <IconoExito className="h-3.5 w-3.5" />
                          Cerrado
                        </span>
                      ) : (
                        <span className="badge bg-eve-alerta/10 text-eve-alerta">
                          Borrador — no facturable
                        </span>
                      )}
                    </td>
                    <td className={tdNum}>{formatoPesos(v.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-eve-linea bg-eve-tinte font-semibold">
                  <td className="px-3 py-2" colSpan={2}>
                    Total facturable (cierres cerrados)
                  </td>
                  <td className="cifra px-3 py-2 text-right">{formatoPesos(totalFacturable)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Facturas con aging */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Facturas</h2>
        {cliente.facturas.length === 0 ? (
          <p className="text-sm text-eve-pizarra">Sin facturas todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-eve-tinte text-left">
                <tr>
                  <th className={thCls}>Emisión</th>
                  <th className={`${thCls} text-right`}>Total</th>
                  <th className={`${thCls} text-right`}>Abonado (FIFO)</th>
                  <th className={`${thCls} text-right`}>Pendiente</th>
                  <th className={`${thCls} text-right`}>Días</th>
                  <th className={thCls}>Rango</th>
                </tr>
              </thead>
              <tbody>
                {cliente.facturas.map((f) => {
                  const s = SEMAFORO_UI[f.semaforo];
                  return (
                    <tr key={f.id}>
                      <td className={tdCls}>{formatoFecha(f.fechaEmision)}</td>
                      <td className={tdNum}>{formatoPesos(f.total)}</td>
                      <td className={`${tdNum} text-eve-pizarra`}>{formatoPesos(f.abonado)}</td>
                      <td className={`${tdNum} font-medium`}>
                        {f.pendiente > 0 ? formatoPesos(f.pendiente) : "—"}
                      </td>
                      <td className={tdNum}>{f.pendiente > 0 ? f.dias : "—"}</td>
                      <td className={tdCls}>
                        {f.pendiente > 0 ? (
                          <span className={`badge ${s.cls}`}>
                            <s.Icono className="h-3.5 w-3.5" />
                            {f.rango}
                          </span>
                        ) : (
                          <span className="badge bg-eve-exito/10 text-eve-exito">
                            <IconoExito className="h-3.5 w-3.5" />
                            Pagada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm text-eve-pizarra">
          Los abonos se aplican primero a la factura más vieja (FIFO). El aging cuenta desde la
          fecha de emisión.
        </p>
      </section>

      {/* Abonos */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Abonos</h2>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="fecha-abono" className="lbl">
              Fecha
            </label>
            <input
              id="fecha-abono"
              type="date"
              value={fechaAbono}
              onChange={(e) => setFechaAbono(e.target.value)}
              className="inp"
            />
          </div>
          <div className="sm:w-48">
            <label htmlFor="valor-abono" className="lbl">
              Valor
            </label>
            <input
              id="valor-abono"
              type="number"
              min={0}
              step="0.01"
              value={valorAbono}
              onChange={(e) => setValorAbono(e.target.value)}
              placeholder="0.00"
              className="inp inp-num"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="detalle-abono" className="lbl">
              Detalle
            </label>
            <input
              id="detalle-abono"
              type="text"
              value={detalleAbono}
              onChange={(e) => setDetalleAbono(e.target.value)}
              placeholder="Opcional"
              className="inp"
            />
          </div>
          {/* Acción secundaria (mezclado) */}
          <button
            onClick={() =>
              ejecutar(
                registrarAbonoAction(
                  cliente.id,
                  fechaAbono,
                  parseFloat(valorAbono) || 0,
                  detalleAbono
                ),
                "Abono registrado.",
                () => {
                  setValorAbono("");
                  setDetalleAbono("");
                }
              )
            }
            disabled={pendiente || !(parseFloat(valorAbono) > 0)}
            className="btn btn-sec shrink-0"
          >
            Registrar abono
          </button>
        </div>
        {cliente.abonos.length === 0 ? (
          <p className="text-sm text-eve-pizarra">Sin abonos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-eve-tinte text-left">
                <tr>
                  <th className={thCls}>Fecha</th>
                  <th className={thCls}>Detalle</th>
                  <th className={`${thCls} text-right`}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {cliente.abonos.map((a) => (
                  <tr key={a.id}>
                    <td className={tdCls}>{formatoFecha(a.fecha)}</td>
                    <td className={`${tdCls} text-eve-pizarra`}>{a.detalle || "—"}</td>
                    <td className={tdNum}>{formatoPesos(a.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
