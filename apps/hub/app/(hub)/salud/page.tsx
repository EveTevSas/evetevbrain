import { Boton, Campo, Plegable, entrada, rejilla } from "@/components/formulario";
import { Indicador } from "@/components/kpi";
import { Aviso, TituloSeccion } from "@/components/seccion";
import { formatoMonto, montoCorto, nombreMes, pct } from "@/lib/formato";
import { rollupDelMes } from "@/lib/hub/rollups";
import { guardarCierreAccion } from "../acciones";

export const dynamic = "force-dynamic";

type Estado = "ok" | "alerta" | "mal" | "sin_datos";
const sinDatos = (etiqueta: string, meta: string) => ({
  etiqueta,
  valor: "—",
  meta: `${meta} · sin datos`,
  estado: "sin_datos" as Estado
});

export default async function SaludPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  const r = await rollupDelMes();
  const e = r.evepay;
  const c = r.cierre;
  const ingresos = r.ingresos.totalMinor;
  const gastoTotal = r.costosMinor + (c?.gastoOperativoMinor ?? 0);
  const resultado = ingresos - gastoTotal; // EBITDA aproximado del mes
  const quema = Math.max(0, -resultado);
  const runwayMeses = c && quema > 0 ? c.cajaMinor / quema : null;
  const mrr = r.ingresos.mrrMinor;

  const grupos: {
    titulo: string;
    sub: string;
    items: { etiqueta: string; valor: string; meta: string; estado: Estado }[];
  }[] = [
    {
      titulo: "Caja & supervivencia",
      sub: "Lo que te mata primero — míralo semanal",
      items: c
        ? [
            {
              etiqueta: "Caja disponible",
              valor: montoCorto(c.cajaMinor),
              meta: `cierre de ${nombreMes(c.mes)}`,
              estado: "ok"
            },
            {
              etiqueta: "Quema neta (burn) mensual",
              valor: quema > 0 ? montoCorto(quema) : "$ 0",
              meta: quema > 0 ? "gastos − ingresos" : "el mes se paga solo",
              estado: quema > 0 ? "alerta" : "ok"
            },
            {
              etiqueta: "Runway",
              valor: runwayMeses == null ? "∞" : `${runwayMeses.toFixed(1)} meses`,
              meta: "meta ≥ 12 meses",
              estado:
                runwayMeses == null
                  ? "ok"
                  : runwayMeses >= 12
                    ? "ok"
                    : runwayMeses >= 6
                      ? "alerta"
                      : "mal"
            },
            {
              etiqueta: "Brecha a equilibrio",
              valor: resultado >= 0 ? "$ 0" : `${montoCorto(-resultado)}/mes`,
              meta: "ingreso extra para breakeven",
              estado: resultado >= 0 ? "ok" : "alerta"
            }
          ]
        : [
            sinDatos("Caja disponible", "registra el cierre del mes"),
            sinDatos("Quema neta (burn) mensual", "gastos − ingresos"),
            sinDatos("Runway", "meta ≥ 12 meses"),
            sinDatos("Brecha a equilibrio", "para breakeven")
          ]
    },
    {
      titulo: "Ingreso recurrente & crecimiento",
      sub: "La máquina de MRR",
      items: [
        {
          etiqueta: "MRR · ingreso recurrente",
          valor: montoCorto(mrr),
          meta: `${r.mrr.eveconecta.suscriptores + r.mrr.eveledger.suscriptores} suscripción(es) activa(s)`,
          estado: mrr > 0 ? "ok" : "sin_datos"
        },
        {
          etiqueta: "ARR · anualizado",
          valor: montoCorto(mrr * 12),
          meta: "MRR × 12",
          estado: mrr > 0 ? "ok" : "sin_datos"
        },
        sinDatos("Crecimiento (MoM)", "necesita histórico de meses"),
        sinDatos("NRR · retención neta", "meta > 100 %"),
        sinDatos("Churn de ingreso", "meta < 3 %")
      ]
    },
    {
      titulo: "Rentabilidad & eficiencia",
      sub: "¿El negocio como un todo funciona?",
      items: [
        {
          etiqueta: "Margen bruto",
          valor: pct(r.margenMinor, ingresos),
          meta: "meta > 70 % · ingresos − proveedores",
          estado: ingresos === 0 ? "sin_datos" : r.margenMinor / ingresos >= 0.7 ? "ok" : "alerta"
        },
        c
          ? {
              etiqueta: "Resultado operativo (≈EBITDA)",
              valor: montoCorto(resultado),
              meta: "meta > $ 0 · incluye gasto operativo",
              estado: resultado >= 0 ? "ok" : "alerta"
            }
          : sinDatos("Resultado operativo (≈EBITDA)", "registra el gasto operativo"),
        c
          ? {
              etiqueta: "Margen operativo",
              valor: pct(resultado, ingresos),
              meta: "meta > 0 %",
              estado: ingresos === 0 ? "sin_datos" : resultado >= 0 ? "ok" : "alerta"
            }
          : sinDatos("Margen operativo", "meta > 0 %")
      ]
    },
    {
      titulo: "Métricas de pagos (somos paytech)",
      sub: "El motor de EvePay",
      items: e
        ? [
            {
              etiqueta: "TPV · volumen procesado",
              valor: montoCorto(e.volumenMesMinor),
              meta: `${e.cobrosMes} cobro(s) este mes`,
              estado: "ok"
            },
            {
              etiqueta: "Take rate",
              valor: pct(e.comisionMesMinor, e.volumenMesMinor, 2),
              meta: "lo que ganamos del TPV",
              estado: e.volumenMesMinor > 0 ? "ok" : "sin_datos"
            },
            {
              etiqueta: "Ingreso neto de procesamiento",
              valor: montoCorto(e.margenMesMinor),
              meta: "comisión − costo del proveedor (ledger)",
              estado: "ok"
            },
            {
              etiqueta: "Costo de proveedor / TPV",
              valor: pct(e.costoMesMinor, e.volumenMesMinor, 2),
              meta: "cuánto cuesta mover $ 1",
              estado: e.volumenMesMinor > 0 ? "ok" : "sin_datos"
            },
            {
              etiqueta: "Aprobación",
              valor: e.aprobacionMesPct != null ? `${e.aprobacionMesPct} %` : "—",
              meta: "cobros aprobados / intentados",
              estado:
                e.aprobacionMesPct == null
                  ? "sin_datos"
                  : e.aprobacionMesPct >= 85
                    ? "ok"
                    : "alerta"
            }
          ]
        : [
            sinDatos("TPV · volumen procesado", "EvePay no respondió"),
            sinDatos("Take rate", "comisión / TPV"),
            sinDatos("Ingreso neto de procesamiento", "comisión − costo"),
            sinDatos("Costo de proveedor / TPV", "por $ 1 movido")
          ]
    }
  ];

  return (
    <>
      <TituloSeccion
        titulo="Salud financiera"
        descripcion="Los signos vitales que una empresa nunca debe perder de vista."
      />
      <Aviso>
        El primer bloque —<strong>caja y runway</strong>— es el que te mata primero: míralo{" "}
        <strong>semanal</strong>. El resto, mensual. Cada indicador trae su <strong>meta</strong> y
        un semáforo; lo que no se puede calcular con datos reales dice «sin datos» en vez de
        inventarse.
      </Aviso>
      {typeof error === "string" && <Aviso tono="alerta">{error}</Aviso>}
      {grupos.map((g) => (
        <section key={g.titulo} style={{ marginBottom: "1.4rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.7rem",
              marginBottom: "0.7rem",
              flexWrap: "wrap"
            }}
          >
            <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>{g.titulo}</h2>
            <span style={{ fontSize: "0.78rem", color: "#94A3B8" }}>{g.sub}</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "0.7rem"
            }}
          >
            {g.items.map((it) => (
              <Indicador key={it.etiqueta} {...it} />
            ))}
          </div>
        </section>
      ))}
      <Plegable
        titulo={
          c
            ? `Actualizar cierre del mes (último: ${nombreMes(c.mes)})`
            : "+ Registrar el cierre del mes (caja y gasto operativo)"
        }
      >
        <form action={guardarCierreAccion} style={rejilla}>
          <Campo etiqueta="Mes">
            <input
              name="mes"
              type="month"
              defaultValue={r.mes.slice(0, 7)}
              required
              style={entrada}
            />
          </Campo>
          <Campo etiqueta="Caja disponible (COP)">
            <input
              name="caja"
              inputMode="numeric"
              required
              defaultValue={c?.cajaMinor ?? ""}
              style={entrada}
            />
          </Campo>
          <Campo
            etiqueta="Gasto operativo del mes (COP)"
            ayuda="Nómina, arriendo, contadores… lo que no es proveedor"
          >
            <input
              name="gastoOperativo"
              inputMode="numeric"
              required
              defaultValue={c?.gastoOperativoMinor ?? ""}
              style={entrada}
            />
          </Campo>
          <Campo etiqueta="Nota">
            <input name="nota" defaultValue={c?.nota ?? ""} style={entrada} />
          </Campo>
          <Boton>Guardar cierre</Boton>
        </form>
        {c && (
          <p style={{ margin: "0.6rem 0 0", fontSize: "0.72rem", color: "#94A3B8" }}>
            Con caja {formatoMonto(c.cajaMinor)} y gasto operativo{" "}
            {formatoMonto(c.gastoOperativoMinor)}.
          </p>
        )}
      </Plegable>
    </>
  );
}
