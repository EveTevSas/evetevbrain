"use client";

import { useState, useTransition } from "react";
import { existenciaTeorica, variacion, alertaMerma } from "@/lib/calc";
import { formatoGalones } from "@/lib/format";
import { guardarInventarioDiaAction } from "@/app/actions/inventarios";
import { IconoError, IconoExito, IconoAlerta } from "@/components/iconos";

interface ProductoUI {
  productId: string;
  nombre: string;
  inicial: number | null;
  ventas: number | null;
  fisico: number | null;
  compras: number[];
}

interface Props {
  fecha: string;
  fechaTexto: string;
  cierreCerrado: boolean;
  productos: ProductoUI[];
}

function num(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

const thCls = "px-2 py-2 font-medium text-eve-pizarra";
const tdCls = "border-t border-eve-linea px-2 py-2";
const tdNum = `${tdCls} text-right tabular-nums`;

export default function InventarioForm(props: Props) {
  // Físico como texto para permitir campo vacío (= no digitado).
  const [fisicos, setFisicos] = useState<string[]>(
    props.productos.map((p) => (p.fisico !== null ? String(p.fisico) : ""))
  );
  const [compras, setCompras] = useState<{ productId: string; galones: number }[]>(
    props.productos.flatMap((p) =>
      p.compras.map((galones) => ({ productId: p.productId, galones }))
    )
  );
  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [pendiente, startTransition] = useTransition();

  function guardar() {
    setMensaje("");
    setErrores([]);
    const fisicosForm = props.productos.map((p, i) => ({
      productId: p.productId,
      galones: fisicos[i].trim() === "" ? null : num(fisicos[i])
    }));
    const comprasForm = compras.filter((c) => c.galones > 0);
    startTransition(async () => {
      const res = await guardarInventarioDiaAction(props.fecha, fisicosForm, comprasForm);
      if (res.errores.length > 0) {
        setErrores(res.errores);
      } else {
        setMensaje("Inventario del día guardado.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1>Inventario del {props.fechaTexto}</h1>
        <p className="text-sm text-eve-pizarra">
          {props.cierreCerrado
            ? "Ventas tomadas del cierre cerrado del día."
            : "El cierre del día no está cerrado: sin ventas todavía."}
        </p>
      </div>

      {/* Físico y derivados por producto */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Inventario por producto</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-eve-tinte text-left">
              <tr>
                <th className={thCls}>Producto</th>
                <th className={`${thCls} text-right`}>Inicial (físico ayer)</th>
                <th className={`${thCls} text-right`}>Compras</th>
                <th className={`${thCls} text-right`}>Ventas</th>
                <th className={`${thCls} text-right`}>Teórica</th>
                <th className={`${thCls} text-right`}>Físico</th>
                <th className={`${thCls} text-right`}>Variación</th>
              </tr>
            </thead>
            <tbody>
              {props.productos.map((p, i) => {
                const comprasTotal = compras
                  .filter((c) => c.productId === p.productId)
                  .reduce((acc, c) => acc + c.galones, 0);
                const teorica =
                  p.inicial !== null && p.ventas !== null
                    ? existenciaTeorica(p.inicial, comprasTotal, p.ventas)
                    : null;
                const fisico = fisicos[i].trim() === "" ? null : num(fisicos[i]);
                const varGal =
                  fisico !== null && teorica !== null ? variacion(fisico, teorica) : null;
                const alerta = varGal !== null && teorica !== null && alertaMerma(varGal, teorica);
                const vacio = <span className="text-eve-muted">—</span>;
                return (
                  <tr key={p.productId}>
                    <td className={`${tdCls} font-medium`}>{p.nombre}</td>
                    <td className={tdNum}>
                      {p.inicial !== null ? formatoGalones(p.inicial) : vacio}
                    </td>
                    <td className={tdNum}>{formatoGalones(comprasTotal)}</td>
                    <td className={tdNum}>
                      {p.ventas !== null ? formatoGalones(p.ventas) : vacio}
                    </td>
                    <td className={tdNum}>{teorica !== null ? formatoGalones(teorica) : vacio}</td>
                    <td className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={fisicos[i]}
                        placeholder="Sin digitar"
                        onChange={(e) =>
                          setFisicos(fisicos.map((f, j) => (j === i ? e.target.value : f)))
                        }
                        className="inp inp-num"
                      />
                    </td>
                    <td className={tdNum}>
                      {varGal !== null ? (
                        alerta ? (
                          <span className="badge bg-eve-alerta/10 text-eve-alerta">
                            <IconoAlerta className="h-3.5 w-3.5" />
                            {formatoGalones(varGal)}
                          </span>
                        ) : (
                          formatoGalones(varGal)
                        )
                      ) : (
                        vacio
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-eve-pizarra">
          Teórica = inicial + compras − ventas. Variación = físico − teórica. La alerta marca
          diferencias altas (posible fuga o robo).
        </p>
      </section>

      {/* Compras del día (descargas) */}
      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2>Compras del día (descargas)</h2>
          <button
            onClick={() =>
              setCompras([
                ...compras,
                { productId: props.productos[0]?.productId ?? "", galones: 0 }
              ])
            }
            className="btn btn-ghost"
          >
            + Agregar descarga
          </button>
        </div>
        {compras.length === 0 ? (
          <p className="text-sm text-eve-pizarra">Sin descargas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-eve-tinte text-left">
                <tr>
                  <th className={thCls}>Producto</th>
                  <th className={`${thCls} text-right`}>Galones</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c, i) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <select
                        value={c.productId}
                        onChange={(e) =>
                          setCompras(
                            compras.map((x, j) =>
                              j === i ? { ...x, productId: e.target.value } : x
                            )
                          )
                        }
                        className="inp"
                      >
                        {props.productos.map((p) => (
                          <option key={p.productId} value={p.productId}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={c.galones}
                        onChange={(e) =>
                          setCompras(
                            compras.map((x, j) =>
                              j === i ? { ...x, galones: num(e.target.value) } : x
                            )
                          )
                        }
                        className="inp inp-num"
                      />
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        onClick={() => setCompras(compras.filter((_, j) => j !== i))}
                        className="lnk-peligro"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

      {/* Único botón coral de la vista (C2): la acción principal */}
      <button onClick={guardar} disabled={pendiente} className="btn btn-cta w-full sm:w-auto">
        Guardar
      </button>
    </div>
  );
}
