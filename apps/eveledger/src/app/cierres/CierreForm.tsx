"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ventasGalones,
  ventasPesos,
  totalVentasPesos,
  totalTarjetas,
  totalTransportadora,
  totalVales,
  totalFaltantesNetos,
  totalRegistrado,
  comprobacion,
  validarLectura,
  redondear,
  type TipoPago
} from "@/lib/calc";
import { formatoPesos, formatoGalones } from "@/lib/format";
import { guardarBorradorAction, cerrarDiaAction } from "@/app/actions/cierres";
import type { CierreFormData } from "@/lib/cierres";
import { IconoError, IconoExito, IconoAlerta } from "@/components/iconos";

export interface LecturaUI {
  nozzleId: string;
  nozzleNombre: string;
  productoNombre: string;
  lecturaInicial: number;
  lecturaFinal: number;
  calibracion: number;
  precio: number;
  esBase: boolean;
}

interface Props {
  closeId: string;
  estado: "DRAFT" | "CLOSED";
  fechaTexto: string;
  lecturas: LecturaUI[];
  pagos: { tipo: TipoPago; detalle: string; valor: number }[];
  vales: { clienteId: string; clienteNombre: string; valor: number }[];
  faltantes: { empleado: string; faltante: number; abono: number }[];
  clientes: { id: string; nombre: string }[];
}

const TIPOS_PAGO: { valor: TipoPago; etiqueta: string }[] = [
  { valor: "TRANSPORTADORA", etiqueta: "Transportadora caja ancla" },
  { valor: "CREDIBANCO", etiqueta: "Credibanco PWS" },
  { valor: "REDEBAN", etiqueta: "Redeban" },
  { valor: "OTRO", etiqueta: "Otro" }
];

function num(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

const thCls = "px-2 py-2 font-medium text-eve-pizarra";
const tdCls = "border-t border-eve-linea px-2 py-2";

export default function CierreForm(props: Props) {
  const soloLectura = props.estado === "CLOSED";
  const router = useRouter();

  const [lecturas, setLecturas] = useState(props.lecturas);
  const [pagos, setPagos] = useState(props.pagos);
  const [vales, setVales] = useState(
    props.vales.map((v) => ({ clienteId: v.clienteId, valor: v.valor }))
  );
  const [faltantes, setFaltantes] = useState(props.faltantes);

  // Efectivo inicial: para un cierre cerrado se deriva del arqueo; para un
  // borrador nuevo arranca en la sugerencia que cuadra la comprobación.
  const [efectivoInicial] = useState(() => {
    if (soloLectura) {
      const total = totalVentasPesos(props.lecturas);
      return redondear(
        total -
          totalTarjetas(props.pagos) -
          totalTransportadora(props.pagos) -
          totalVales(props.vales.map((v) => v.valor)) -
          totalFaltantesNetos(props.faltantes)
      );
    }
    return 0;
  });
  const [efectivo, setEfectivo] = useState(efectivoInicial);

  const [errores, setErrores] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [pendiente, startTransition] = useTransition();

  // ---- Cálculos en vivo (mismas funciones del servidor) ----
  const totalVentas = totalVentasPesos(lecturas);
  const tTarjetas = totalTarjetas(pagos);
  const tTransp = totalTransportadora(pagos);
  const tVales = totalVales(vales.map((v) => v.valor));
  const tFaltantes = totalFaltantesNetos(faltantes);
  const arqueo = {
    efectivo,
    pagos,
    vales: vales.map((v) => v.valor),
    faltantes
  };
  const tRegistrado = totalRegistrado(arqueo);
  const comp = comprobacion(totalVentas, arqueo);
  const cuadrado = comp === 0;

  const erroresValidacion = lecturas.flatMap((l) =>
    validarLectura(l).map((e) => `${l.nozzleNombre}: ${e}`)
  );

  function datosActuales(): CierreFormData {
    return { lecturas, pagos, vales, faltantes, efectivo };
  }

  function guardar(cerrar: boolean) {
    setMensaje("");
    setErrores([]);
    startTransition(async () => {
      const accion = cerrar ? cerrarDiaAction : guardarBorradorAction;
      const res = await accion(props.closeId, datosActuales());
      if (res.errores.length > 0) {
        setErrores(res.errores);
      } else if (cerrar) {
        router.refresh();
        setMensaje("Día cerrado correctamente. El cierre quedó en solo lectura.");
      } else {
        setMensaje("Borrador guardado.");
      }
    });
  }

  function sugerirEfectivo() {
    setEfectivo(redondear(totalVentas - tTarjetas - tTransp - tVales - tFaltantes));
  }

  function setLectura(i: number, campo: keyof LecturaUI, valor: number) {
    setLecturas((prev) => prev.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>Cierre del {props.fechaTexto}</h1>
          <p className="text-sm text-eve-pizarra">
            {soloLectura ? "Cerrado — solo lectura" : "Borrador editable"}
          </p>
        </div>
        {soloLectura ? (
          <span className="badge bg-eve-exito/10 text-eve-exito">
            <IconoExito className="h-3.5 w-3.5" />
            Cerrado
          </span>
        ) : (
          <span className="badge bg-eve-alerta/10 text-eve-alerta">Borrador</span>
        )}
      </div>

      {/* Surtidores */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Surtidores</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-eve-tinte text-left">
              <tr>
                <th className={thCls}>Manguera</th>
                <th className={thCls}>Producto</th>
                <th className={`${thCls} text-right`}>Lect. inicial</th>
                <th className={`${thCls} text-right`}>Lect. final</th>
                <th className={`${thCls} text-right`}>Calibración</th>
                <th className={`${thCls} text-right`}>Precio/galón</th>
                <th className={`${thCls} text-right`}>Galones</th>
                <th className={`${thCls} text-right`}>Ventas $</th>
              </tr>
            </thead>
            <tbody>
              {lecturas.map((l, i) => (
                <tr key={l.nozzleId}>
                  <td className={`${tdCls} font-medium`}>{l.nozzleNombre}</td>
                  <td className={`${tdCls} text-eve-pizarra`}>{l.productoNombre}</td>
                  <td className={tdCls}>
                    {l.esBase && !soloLectura ? (
                      <input
                        type="number"
                        min={0}
                        step="0.001"
                        value={l.lecturaInicial}
                        onChange={(e) => setLectura(i, "lecturaInicial", num(e.target.value))}
                        className="inp inp-num"
                        title="Lectura base (solo se digita en el primer cierre)"
                      />
                    ) : (
                      <div className="px-3 py-2 text-right tabular-nums text-eve-pizarra">
                        {formatoGalones(l.lecturaInicial)}
                      </div>
                    )}
                  </td>
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={l.lecturaFinal}
                      disabled={soloLectura}
                      onChange={(e) => setLectura(i, "lecturaFinal", num(e.target.value))}
                      className="inp inp-num"
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={l.calibracion}
                      disabled={soloLectura}
                      onChange={(e) => setLectura(i, "calibracion", num(e.target.value))}
                      className="inp inp-num"
                    />
                  </td>
                  <td className={tdCls}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.precio}
                      disabled={soloLectura}
                      onChange={(e) => setLectura(i, "precio", num(e.target.value))}
                      className="inp inp-num"
                    />
                  </td>
                  <td className={`${tdCls} text-right tabular-nums`}>
                    {formatoGalones(ventasGalones(l))}
                  </td>
                  <td className={`${tdCls} text-right tabular-nums`}>
                    {formatoPesos(ventasPesos(l))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-eve-linea bg-eve-tinte font-semibold">
                <td className="px-2 py-2" colSpan={7}>
                  Total ventas
                </td>
                {/* Cifra protagonista en Baloo 2 700 */}
                <td className="cifra px-2 py-2 text-right">{formatoPesos(totalVentas)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* Errores de validación: ícono + texto (C5) */}
        {erroresValidacion.length > 0 && (
          <ul
            role="alert"
            className="mt-3 space-y-1 rounded-[9px] bg-eve-error/10 px-3 py-2 text-sm text-eve-error"
          >
            {erroresValidacion.map((e, i) => (
              <li key={i} className="flex items-center gap-2">
                <IconoError className="h-4 w-4 shrink-0" />
                {e}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pagos (medios electrónicos y transportadora) */}
      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2>Medios de pago</h2>
          {!soloLectura && (
            <button
              onClick={() => setPagos([...pagos, { tipo: "CREDIBANCO", detalle: "", valor: 0 }])}
              className="btn btn-ghost"
            >
              + Agregar pago
            </button>
          )}
        </div>
        {pagos.length === 0 ? (
          <p className="text-sm text-eve-pizarra">Sin pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-eve-tinte text-left">
                <tr>
                  <th className={thCls}>Tipo</th>
                  <th className={thCls}>Detalle</th>
                  <th className={`${thCls} text-right`}>Valor</th>
                  {!soloLectura && <th className={thCls}></th>}
                </tr>
              </thead>
              <tbody>
                {pagos.map((p, i) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <select
                        value={p.tipo}
                        disabled={soloLectura}
                        onChange={(e) =>
                          setPagos(
                            pagos.map((x, j) =>
                              j === i ? { ...x, tipo: e.target.value as TipoPago } : x
                            )
                          )
                        }
                        className="inp"
                      >
                        {TIPOS_PAGO.map((t) => (
                          <option key={t.valor} value={t.valor}>
                            {t.etiqueta}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={tdCls}>
                      <input
                        type="text"
                        value={p.detalle}
                        disabled={soloLectura}
                        placeholder="Opcional"
                        onChange={(e) =>
                          setPagos(
                            pagos.map((x, j) => (j === i ? { ...x, detalle: e.target.value } : x))
                          )
                        }
                        className="inp"
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.valor}
                        disabled={soloLectura}
                        onChange={(e) =>
                          setPagos(
                            pagos.map((x, j) =>
                              j === i ? { ...x, valor: num(e.target.value) } : x
                            )
                          )
                        }
                        className="inp inp-num"
                      />
                    </td>
                    {!soloLectura && (
                      <td className={`${tdCls} text-right`}>
                        <button
                          onClick={() => setPagos(pagos.filter((_, j) => j !== i))}
                          className="lnk-peligro"
                        >
                          Quitar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Vales del día */}
      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2>Vales del día (crédito)</h2>
          {!soloLectura && (
            <button
              onClick={() =>
                setVales([...vales, { clienteId: props.clientes[0]?.id ?? "", valor: 0 }])
              }
              disabled={props.clientes.length === 0}
              title={props.clientes.length === 0 ? "Primero crea un cliente en Cartera" : ""}
              className="btn btn-ghost"
            >
              + Agregar vale
            </button>
          )}
        </div>
        {vales.length === 0 ? (
          <p className="text-sm text-eve-pizarra">
            {props.clientes.length === 0 && !soloLectura
              ? "No hay clientes de cartera: créalos en la sección Cartera."
              : "Sin vales."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-eve-tinte text-left">
                <tr>
                  <th className={thCls}>Cliente</th>
                  <th className={`${thCls} text-right`}>Valor</th>
                  {!soloLectura && <th className={thCls}></th>}
                </tr>
              </thead>
              <tbody>
                {vales.map((v, i) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <select
                        value={v.clienteId}
                        disabled={soloLectura}
                        onChange={(e) =>
                          setVales(
                            vales.map((x, j) => (j === i ? { ...x, clienteId: e.target.value } : x))
                          )
                        }
                        className="inp"
                      >
                        {v.clienteId && !props.clientes.some((c) => c.id === v.clienteId) && (
                          <option value={v.clienteId}>
                            {props.vales[i]?.clienteNombre ?? "Cliente inactivo"}
                          </option>
                        )}
                        {props.clientes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={v.valor}
                        disabled={soloLectura}
                        onChange={(e) =>
                          setVales(
                            vales.map((x, j) =>
                              j === i ? { ...x, valor: num(e.target.value) } : x
                            )
                          )
                        }
                        className="inp inp-num"
                      />
                    </td>
                    {!soloLectura && (
                      <td className={`${tdCls} text-right`}>
                        <button
                          onClick={() => setVales(vales.filter((_, j) => j !== i))}
                          className="lnk-peligro"
                        >
                          Quitar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Faltantes de isleros */}
      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2>Faltantes de isleros</h2>
          {!soloLectura && (
            <button
              onClick={() => setFaltantes([...faltantes, { empleado: "", faltante: 0, abono: 0 }])}
              className="btn btn-ghost"
            >
              + Agregar faltante
            </button>
          )}
        </div>
        {faltantes.length === 0 ? (
          <p className="text-sm text-eve-pizarra">Sin faltantes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-eve-tinte text-left">
                <tr>
                  <th className={thCls}>Empleado</th>
                  <th className={`${thCls} text-right`}>Faltante</th>
                  <th className={`${thCls} text-right`}>Abono</th>
                  <th className={`${thCls} text-right`}>Neto</th>
                  {!soloLectura && <th className={thCls}></th>}
                </tr>
              </thead>
              <tbody>
                {faltantes.map((f, i) => (
                  <tr key={i}>
                    <td className={tdCls}>
                      <input
                        type="text"
                        value={f.empleado}
                        disabled={soloLectura}
                        onChange={(e) =>
                          setFaltantes(
                            faltantes.map((x, j) =>
                              j === i ? { ...x, empleado: e.target.value } : x
                            )
                          )
                        }
                        className="inp"
                      />
                    </td>
                    <td className={tdCls}>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={f.faltante}
                        disabled={soloLectura}
                        onChange={(e) =>
                          setFaltantes(
                            faltantes.map((x, j) =>
                              j === i ? { ...x, faltante: num(e.target.value) } : x
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
                        value={f.abono}
                        disabled={soloLectura}
                        onChange={(e) =>
                          setFaltantes(
                            faltantes.map((x, j) =>
                              j === i ? { ...x, abono: num(e.target.value) } : x
                            )
                          )
                        }
                        className="inp inp-num"
                      />
                    </td>
                    <td className={`${tdCls} text-right tabular-nums`}>
                      {formatoPesos(redondear(f.faltante - f.abono))}
                    </td>
                    {!soloLectura && (
                      <td className={`${tdCls} text-right`}>
                        <button
                          onClick={() => setFaltantes(faltantes.filter((_, j) => j !== i))}
                          className="lnk-peligro"
                        >
                          Quitar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Arqueo de caja */}
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4">Arqueo de caja</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="efectivo" className="lbl">
              Efectivo registrado en caja
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="efectivo"
                type="number"
                min={0}
                step="0.01"
                value={efectivo}
                disabled={soloLectura}
                onChange={(e) => setEfectivo(num(e.target.value))}
                className="inp inp-num"
              />
              {!soloLectura && (
                <button
                  onClick={sugerirEfectivo}
                  className="btn btn-ghost shrink-0"
                  title="Calcula el efectivo que cuadra la comprobación"
                >
                  Sugerir
                </button>
              )}
            </div>
          </div>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt>Total ventas</dt>
              <dd className="cifra">{formatoPesos(totalVentas)}</dd>
            </div>
            <div className="flex justify-between text-eve-pizarra">
              <dt>Efectivo</dt>
              <dd className="tabular-nums">{formatoPesos(efectivo)}</dd>
            </div>
            <div className="flex justify-between text-eve-pizarra">
              <dt>Tarjetas (Credibanco PWS + Redeban)</dt>
              <dd className="tabular-nums">{formatoPesos(tTarjetas)}</dd>
            </div>
            <div className="flex justify-between text-eve-pizarra">
              <dt>Transportadora caja ancla</dt>
              <dd className="tabular-nums">{formatoPesos(tTransp)}</dd>
            </div>
            <div className="flex justify-between text-eve-pizarra">
              <dt>Cartera (vales del día)</dt>
              <dd className="tabular-nums">{formatoPesos(tVales)}</dd>
            </div>
            <div className="flex justify-between text-eve-pizarra">
              <dt>Faltantes netos</dt>
              <dd className="tabular-nums">{formatoPesos(tFaltantes)}</dd>
            </div>
            <div className="flex justify-between border-t border-eve-linea pt-2 font-medium">
              <dt>Total registrado</dt>
              <dd className="tabular-nums">{formatoPesos(tRegistrado)}</dd>
            </div>
          </dl>
        </div>

        {/* Semáforo de comprobación: ícono + texto + color semántico (C5) */}
        <div className="mt-4">
          {cuadrado ? (
            <p className="badge bg-eve-exito/10 text-eve-exito !px-4 !py-2 text-sm">
              <IconoExito className="h-4 w-4" />
              Comprobación cuadrada en $0. El día se puede cerrar.
            </p>
          ) : (
            <p className="badge bg-eve-error/10 text-eve-error !px-4 !py-2 text-sm" role="alert">
              <IconoAlerta className="h-4 w-4" />
              <span>
                Comprobación descuadrada: <strong className="cifra">{formatoPesos(comp)}</strong>.
                Debe ser exactamente $0 para cerrar el día.
              </span>
            </p>
          )}
        </div>
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

      {!soloLectura && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Secundario (mezclado) */}
          <button
            onClick={() => guardar(false)}
            disabled={pendiente || erroresValidacion.length > 0}
            className="btn btn-sec w-full sm:w-auto"
          >
            Guardar borrador
          </button>
          {/* Único botón coral de la vista (C2): la acción principal */}
          <button
            onClick={() => guardar(true)}
            disabled={pendiente || !cuadrado || erroresValidacion.length > 0}
            className="btn btn-cta w-full sm:w-auto"
            title={cuadrado ? "" : "La comprobación debe ser $0"}
          >
            Cerrar día
          </button>
        </div>
      )}
    </div>
  );
}
