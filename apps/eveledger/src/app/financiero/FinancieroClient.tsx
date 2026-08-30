"use client";

import { useState, useTransition } from "react";
import { redondear, margenPorGalon, utilidadBruta } from "@/lib/calc";
import { formatoPesos, formatoGalones } from "@/lib/format";
import {
  guardarCostosAction,
  agregarGastoAction,
  eliminarGastoAction
} from "@/app/actions/financiero";
import { IconoError, IconoExito, IconoAlerta } from "@/components/iconos";
import type { CategoriaGasto } from "@/lib/financiero";

interface MargenProductoUI {
  productId: string;
  nombre: string;
  galones: number;
  ventasPesos: number;
  pVenta: number | null;
  precioCompra: number;
  flete: number;
}

interface GastosUI {
  gastos: {
    id: string;
    categoria: CategoriaGasto;
    valor: number;
    cantidad: number | null;
    detalle: string;
  }[];
  totalMes: number;
  comparativa: { categoria: CategoriaGasto; actual: number; anterior: number }[];
}

interface Props {
  anio: number;
  mes: number;
  mesTexto: string;
  margenes: MargenProductoUI[];
  gastos: GastosUI;
}

const CATEGORIAS: { valor: CategoriaGasto; etiqueta: string; cantidadLbl: string | null }[] = [
  { valor: "NOMINA", etiqueta: "Nómina", cantidadLbl: "# empleados" },
  { valor: "SERVICIOS", etiqueta: "Servicios públicos", cantidadLbl: "Consumo (KW)" },
  { valor: "FLETES", etiqueta: "Fletes", cantidadLbl: null },
  { valor: "OTROS", etiqueta: "Otros gastos", cantidadLbl: null }
];

const etiquetaCategoria = (c: CategoriaGasto) =>
  CATEGORIAS.find((x) => x.valor === c)?.etiqueta ?? c;

const thCls = "px-3 py-2 font-medium text-eve-pizarra";
const tdCls = "border-t border-eve-linea px-3 py-2";
const tdNum = `${tdCls} text-right tabular-nums`;

function num(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export default function FinancieroClient(props: Props) {
  // Costos como texto para permitir edición parcial.
  const [costos, setCostos] = useState(
    props.margenes.map((m) => ({
      productId: m.productId,
      precioCompra: m.precioCompra > 0 ? String(m.precioCompra) : "",
      flete: m.flete > 0 ? String(m.flete) : ""
    }))
  );
  const [categoria, setCategoria] = useState<CategoriaGasto>("NOMINA");
  const [valorGasto, setValorGasto] = useState("");
  const [cantidadGasto, setCantidadGasto] = useState("");
  const [detalleGasto, setDetalleGasto] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [pendiente, startTransition] = useTransition();

  function ejecutar(accion: Promise<{ errores: string[] }>, ok: string, limpiar?: () => void) {
    setErrores([]);
    setMensaje("");
    startTransition(async () => {
      const res = await accion;
      if (res.errores.length > 0) {
        setErrores(res.errores);
      } else {
        setMensaje(ok);
        limpiar?.();
      }
    });
  }

  const cantidadLbl = CATEGORIAS.find((c) => c.valor === categoria)?.cantidadLbl ?? null;

  return (
    <div className="space-y-8">
      {/* Errores y mensajes: ícono + texto (C5) */}
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

      {/* Margen por producto */}
      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2>Margen por producto — {props.mesTexto}</h2>
          {/* Acción secundaria (mezclado): la vista es mayormente derivada, sin CTA coral */}
          <button
            onClick={() =>
              ejecutar(
                guardarCostosAction(
                  props.anio,
                  props.mes,
                  costos.map((c) => ({
                    productId: c.productId,
                    precioCompra: num(c.precioCompra),
                    flete: num(c.flete)
                  }))
                ),
                "Costos guardados."
              )
            }
            disabled={pendiente}
            className="btn btn-sec"
          >
            Guardar costos
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-eve-tinte text-left">
              <tr>
                <th className={thCls}>Producto</th>
                <th className={`${thCls} text-right`}>Galones mes</th>
                <th className={`${thCls} text-right`}>P/VENTA (calc)</th>
                <th className={`${thCls} text-right`}>P/COMPRA</th>
                <th className={`${thCls} text-right`}>FLETE/gal</th>
                <th className={`${thCls} text-right`}>Margen/gal</th>
                <th className={`${thCls} text-right`}>Utilidad bruta</th>
              </tr>
            </thead>
            <tbody>
              {props.margenes.map((m, i) => {
                const pCompra = num(costos[i].precioCompra);
                const flete = num(costos[i].flete);
                const margen = m.pVenta !== null ? margenPorGalon(m.pVenta, pCompra, flete) : null;
                const utilidad = margen !== null ? utilidadBruta(margen, m.galones) : null;
                const vacio = <span className="text-eve-muted">—</span>;
                return (
                  <tr key={m.productId}>
                    <td className={`${tdCls} font-medium`}>{m.nombre}</td>
                    <td className={tdNum}>{m.galones > 0 ? formatoGalones(m.galones) : vacio}</td>
                    <td className={`${tdNum} text-eve-pizarra`}>
                      {m.pVenta !== null ? formatoPesos(m.pVenta) : vacio}
                    </td>
                    <td className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={costos[i].precioCompra}
                        placeholder="0.00"
                        aria-label={`Precio de compra de ${m.nombre}`}
                        onChange={(e) =>
                          setCostos(
                            costos.map((c, j) =>
                              j === i ? { ...c, precioCompra: e.target.value } : c
                            )
                          )
                        }
                        className="inp inp-num"
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={costos[i].flete}
                        placeholder="0.00"
                        aria-label={`Flete por galón de ${m.nombre}`}
                        onChange={(e) =>
                          setCostos(
                            costos.map((c, j) => (j === i ? { ...c, flete: e.target.value } : c))
                          )
                        }
                        className="inp inp-num"
                      />
                    </td>
                    <td className={tdNum}>
                      {margen !== null ? (
                        <span className={margen < 0 ? "text-eve-error font-medium" : ""}>
                          {formatoPesos(margen)}
                        </span>
                      ) : (
                        vacio
                      )}
                    </td>
                    {/* Cifra protagonista en Baloo 2 700 (§3) */}
                    <td className="cifra border-t border-eve-linea px-3 py-2 text-right">
                      {utilidad !== null ? formatoPesos(utilidad) : vacio}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-eve-pizarra">
          P/VENTA = ventas del mes ÷ galones (cierres cerrados). Margen = P/VENTA − P/COMPRA −
          FLETE. Utilidad = margen × galones del mes.
        </p>
      </section>

      {/* Gastos operativos */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Gastos operativos — {props.mesTexto}</h2>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="categoria" className="lbl">
              Categoría
            </label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
              className="inp"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-44">
            <label htmlFor="valor-gasto" className="lbl">
              Valor
            </label>
            <input
              id="valor-gasto"
              type="number"
              min={0}
              step="0.01"
              value={valorGasto}
              onChange={(e) => setValorGasto(e.target.value)}
              placeholder="0.00"
              className="inp inp-num"
            />
          </div>
          {cantidadLbl && (
            <div className="sm:w-40">
              <label htmlFor="cantidad-gasto" className="lbl">
                {cantidadLbl}
              </label>
              <input
                id="cantidad-gasto"
                type="number"
                min={0}
                step="1"
                value={cantidadGasto}
                onChange={(e) => setCantidadGasto(e.target.value)}
                placeholder="Opcional"
                className="inp inp-num"
              />
            </div>
          )}
          <div className="flex-1">
            <label htmlFor="detalle-gasto" className="lbl">
              Detalle
            </label>
            <input
              id="detalle-gasto"
              type="text"
              value={detalleGasto}
              onChange={(e) => setDetalleGasto(e.target.value)}
              placeholder="Opcional"
              className="inp"
            />
          </div>
          {/* Acción secundaria (mezclado) */}
          <button
            onClick={() =>
              ejecutar(
                agregarGastoAction(
                  props.anio,
                  props.mes,
                  categoria,
                  num(valorGasto),
                  cantidadGasto.trim() === "" ? null : num(cantidadGasto),
                  detalleGasto
                ),
                "Gasto registrado.",
                () => {
                  setValorGasto("");
                  setCantidadGasto("");
                  setDetalleGasto("");
                }
              )
            }
            disabled={pendiente || !(num(valorGasto) > 0)}
            className="btn btn-sec shrink-0"
          >
            Agregar gasto
          </button>
        </div>

        {props.gastos.gastos.length === 0 ? (
          <p className="text-sm text-eve-pizarra">Sin gastos registrados este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-eve-tinte text-left">
                <tr>
                  <th className={thCls}>Categoría</th>
                  <th className={thCls}>Detalle</th>
                  <th className={`${thCls} text-right`}>Cantidad</th>
                  <th className={`${thCls} text-right`}>Valor</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {props.gastos.gastos.map((g) => (
                  <tr key={g.id}>
                    <td className={`${tdCls} font-medium`}>{etiquetaCategoria(g.categoria)}</td>
                    <td className={`${tdCls} text-eve-pizarra`}>{g.detalle || "—"}</td>
                    <td className={tdNum}>
                      {g.cantidad !== null ? (
                        formatoGalones(g.cantidad)
                      ) : (
                        <span className="text-eve-muted">—</span>
                      )}
                    </td>
                    <td className={tdNum}>{formatoPesos(g.valor)}</td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        onClick={() => ejecutar(eliminarGastoAction(g.id), "Gasto eliminado.")}
                        disabled={pendiente}
                        className="lnk-peligro"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-eve-linea bg-eve-tinte font-semibold">
                  <td className="px-3 py-2" colSpan={3}>
                    Total gastos del mes
                  </td>
                  <td className="cifra px-3 py-2 text-right" colSpan={2}>
                    {formatoPesos(props.gastos.totalMes)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Comparativa mensual */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Comparativa por categoría (mes actual vs anterior)</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-eve-tinte text-left">
              <tr>
                <th className={thCls}>Categoría</th>
                <th className={`${thCls} text-right`}>Mes anterior</th>
                <th className={`${thCls} text-right`}>Mes actual</th>
                <th className={`${thCls} text-right`}>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {props.gastos.comparativa.map((c) => {
                const delta = redondear(c.actual - c.anterior);
                const pct = c.anterior > 0 ? delta / c.anterior : null;
                return (
                  <tr key={c.categoria}>
                    <td className={`${tdCls} font-medium`}>{etiquetaCategoria(c.categoria)}</td>
                    <td className={`${tdNum} text-eve-pizarra`}>{formatoPesos(c.anterior)}</td>
                    <td className={tdNum}>{formatoPesos(c.actual)}</td>
                    <td className={tdNum}>
                      {delta === 0 ? (
                        <span className="text-eve-muted">—</span>
                      ) : delta > 0 ? (
                        <span className="badge bg-eve-alerta/10 text-eve-alerta">
                          <IconoAlerta className="h-3.5 w-3.5" />+{formatoPesos(delta)}
                          {pct !== null && ` (+${Math.round(pct * 100)}%)`}
                        </span>
                      ) : (
                        <span className="badge bg-eve-exito/10 text-eve-exito">
                          <IconoExito className="h-3.5 w-3.5" />
                          {formatoPesos(delta)}
                          {pct !== null && ` (${Math.round(pct * 100)}%)`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
