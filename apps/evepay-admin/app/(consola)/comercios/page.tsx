import { TituloSeccion } from "@/components/seccion";
import {
  ErrorApi,
  listarComercios,
  resumenComercios,
  type Comercio,
  type ResumenComercio
} from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";
import { Search } from "lucide-react";
import Link from "next/link";
import { NuevoComercio } from "./nuevo-comercio";

export const dynamic = "force-dynamic";

const celda: React.CSSProperties = {
  padding: "0.9rem 1rem",
  fontSize: "0.84rem",
  borderBottom: "1px solid #F1F5F9",
  verticalAlign: "middle"
};
const encabezado: React.CSSProperties = {
  padding: "0.7rem 1rem",
  fontSize: "0.7rem",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.04em",
  textAlign: "left",
  borderBottom: "1px solid #E2E8F0",
  background: "#FAFAF7",
  whiteSpace: "nowrap"
};
const num: React.CSSProperties = {
  ...celda,
  fontFamily: "ui-monospace, Menlo, monospace",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap"
};

type Tono = "verde" | "ambar" | "gris" | "rojo" | "azul";
const TONOS: Record<Tono, { bg: string; fg: string }> = {
  verde: { bg: "#E3F3EA", fg: "#1C7A52" },
  ambar: { bg: "#FBF0D8", fg: "#A9700F" },
  gris: { bg: "#EEEDE8", fg: "#565564" },
  rojo: { bg: "#FBE6E8", fg: "#B23545" },
  azul: { bg: "#E7EEFA", fg: "#2F5F9E" }
};

function Etiqueta({ texto, tono }: { texto: string; tono: Tono }) {
  const c = TONOS[tono];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        background: c.bg,
        color: c.fg,
        borderRadius: 999,
        padding: "0.2rem 0.65rem",
        fontSize: "0.74rem",
        fontWeight: 600,
        whiteSpace: "nowrap"
      }}
    >
      <i style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
      {texto}
    </span>
  );
}

/** Estado operativo del comercio, el que importa para saber si puede cobrar. */
function situacion(
  c: Comercio,
  r: ResumenComercio | undefined
): { texto: string; tono: Tono; clave: string } {
  if (c.estado !== "activo") return { texto: "inactivo", tono: "gris", clave: "inactivos" };
  if (!c.merchantEstado || c.merchantEstado === "pendiente" || c.merchantEstado === "en_revision")
    return { texto: "onboarding", tono: "azul", clave: "onboarding" };
  if (c.merchantEstado === "rechazado")
    return { texto: "rechazado", tono: "rojo", clave: "revision" };
  if (!r?.tieneTarifa || !c.tienePerfil)
    return { texto: "incompleto", tono: "ambar", clave: "revision" };
  if ((r?.retencionesActivas ?? 0) > 0)
    return { texto: "en revisión", tono: "ambar", clave: "revision" };
  return { texto: "activo", tono: "verde", clave: "activos" };
}

function Riesgo({ r }: { r: ResumenComercio | undefined }) {
  if (!r || (r.cobrosMes === 0 && r.retenidasRiesgo30d === 0 && r.retencionesActivas === 0)) {
    return <span style={{ color: "#94A3B8" }}>—</span>;
  }
  // Señal simple y honesta: cuántas veces el motor retuvo o rechazó en 30 días
  // y si hay dinero retenido hoy. No es un score inventado.
  const nivel =
    r.retencionesActivas > 0 ? 3 : r.retenidasRiesgo30d > 2 ? 2 : r.retenidasRiesgo30d > 0 ? 1 : 0;
  const color = ["#1C7A52", "#A9700F", "#A9700F", "#B23545"][nivel];
  const ancho = [12, 40, 65, 100][nivel];
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      title={`${r.retenidasRiesgo30d} evaluaciones que actuaron en 30 días · ${r.retencionesActivas} retención(es) activa(s)`}
    >
      <span
        style={{
          width: 46,
          height: 6,
          borderRadius: 3,
          background: "#ECEAE2",
          overflow: "hidden",
          display: "inline-block"
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${ancho}%`,
            background: color,
            borderRadius: 3
          }}
        />
      </span>
      <span
        style={{
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: "0.8rem",
          color: "#0A2540"
        }}
      >
        {r.retencionesActivas > 0 ? `${r.retencionesActivas} ret.` : r.retenidasRiesgo30d}
      </span>
    </span>
  );
}

export default async function ComerciosPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtro = typeof params.filtro === "string" ? params.filtro : "todos";
  const q = (typeof params.q === "string" ? params.q : "").trim().toLowerCase();

  let comercios: Comercio[] = [];
  const resumen = new Map<string, ResumenComercio>();
  let error: string | null = null;
  try {
    const [lista, res] = await Promise.all([listarComercios(), resumenComercios()]);
    comercios = lista;
    for (const r of res) resumen.set(r.tenantId, r);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar la lista de comercios.";
  }

  const conSituacion = comercios.map((c) => ({
    c,
    r: resumen.get(c.tenantId),
    s: situacion(c, resumen.get(c.tenantId))
  }));
  const conteo = (clave: string) => conSituacion.filter((x) => x.s.clave === clave).length;
  const filtros = [
    ["todos", "Todos", conSituacion.length],
    ["activos", "Activos", conteo("activos")],
    ["revision", "En revisión", conteo("revision")],
    ["onboarding", "Onboarding", conteo("onboarding")],
    ["inactivos", "Inactivos", conteo("inactivos")]
  ] as const;
  const visibles = conSituacion
    .filter((x) => filtro === "todos" || x.s.clave === filtro)
    .filter(
      (x) =>
        !q ||
        `${x.c.displayName} ${x.c.legalName} ${x.c.documento ?? ""} ${x.r?.ciudad ?? ""}`
          .toLowerCase()
          .includes(q)
    )
    .sort(
      (a, b) =>
        (b.r?.volumenMesMinor ?? 0) - (a.r?.volumenMesMinor ?? 0) ||
        a.c.displayName.localeCompare(b.c.displayName)
    );

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem"
        }}
      >
        <div style={{ flex: 1 }}>
          <TituloSeccion
            titulo="Comercios"
            descripcion={`Cada comercio es un tenant aislado por RLS · ${conteo("activos")} activos de ${comercios.length}`}
          />
        </div>
        <NuevoComercio />
      </div>

      {error ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 14,
            padding: "1.5rem"
          }}
        >
          <p style={{ margin: 0, fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}>
            {error}
          </p>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#64748B" }}>
            La consola no guarda datos propios: todo lo lee de la API de EvePay.
          </p>
        </div>
      ) : (
        <>
          <form
            method="get"
            style={{
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "1rem"
            }}
          >
            {filtros.map(([clave, texto, n]) => {
              const on = filtro === clave;
              return (
                <Link
                  key={clave}
                  href={`/comercios?filtro=${clave}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  style={{
                    border: `1px solid ${on ? "#0A2540" : "#E2E8F0"}`,
                    background: on ? "#0A2540" : "#fff",
                    color: on ? "#fff" : "#475569",
                    borderRadius: 999,
                    padding: "0.4rem 0.9rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textDecoration: "none"
                  }}
                >
                  {texto} · {n}
                </Link>
              );
            })}
            <span style={{ flex: 1 }} />
            <input type="hidden" name="filtro" value={filtro} />
            <label style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <Search size={14} color="#94A3B8" style={{ position: "absolute", left: 10 }} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar comercio, NIT, ciudad…"
                style={{
                  border: "1px solid #E2E8F0",
                  background: "#fff",
                  borderRadius: 10,
                  padding: "0.5rem 0.75rem 0.5rem 2rem",
                  fontSize: "0.82rem",
                  width: 260,
                  color: "#0A2540"
                }}
              />
            </label>
          </form>

          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 1px 2px rgba(10,37,64,.05)"
            }}
          >
            {visibles.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  padding: "2.5rem",
                  fontSize: "0.87rem",
                  color: "#64748B",
                  textAlign: "center"
                }}
              >
                {comercios.length === 0
                  ? "Todavía no hay comercios. Crea el primero con el botón de arriba."
                  : "Ningún comercio coincide con el filtro."}
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
                  <thead>
                    <tr>
                      <th style={encabezado}>Comercio</th>
                      <th style={encabezado}>Ciudad</th>
                      <th style={encabezado}>Estado</th>
                      <th style={encabezado}>KYC</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Volumen (mes)</th>
                      <th style={{ ...encabezado, textAlign: "right" }}>Por pagar</th>
                      <th style={encabezado}>Tarifa</th>
                      <th style={encabezado}>Riesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map(({ c, r, s }) => (
                      <tr key={c.tenantId} style={{ opacity: c.estado === "activo" ? 1 : 0.6 }}>
                        <td style={celda}>
                          <Link
                            href={`/comercios/${c.tenantId}`}
                            style={{
                              fontWeight: 700,
                              color: "#0A2540",
                              textDecoration: "none",
                              fontSize: "0.9rem"
                            }}
                          >
                            {c.displayName}
                          </Link>
                          <div
                            style={{ fontSize: "0.76rem", color: "#94A3B8", marginTop: "0.15rem" }}
                          >
                            {c.documento ?? c.legalName}
                            {c.documento && c.legalName !== c.displayName
                              ? ` · ${c.legalName}`
                              : ""}
                          </div>
                        </td>
                        <td style={{ ...celda, color: "#475569" }}>
                          {r?.ciudad ?? <span style={{ color: "#CBD5E1" }}>—</span>}
                        </td>
                        <td style={celda}>
                          <Etiqueta texto={s.texto} tono={s.tono} />
                        </td>
                        <td
                          style={{
                            ...celda,
                            fontSize: "0.78rem",
                            color: c.merchantEstado === "aprobado" ? "#1C7A52" : "#A9700F"
                          }}
                        >
                          {c.merchantEstado ?? "sin comercio"}
                        </td>
                        <td style={{ ...num, textAlign: "right" }}>
                          {r && r.cobrosMes > 0 ? (
                            <>
                              {formatoMonto(r.volumenMesMinor, "COP")}
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#94A3B8",
                                  fontFamily: "inherit"
                                }}
                              >
                                {r.cobrosMes} cobro(s)
                              </div>
                            </>
                          ) : (
                            <span style={{ color: "#CBD5E1" }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...num,
                            textAlign: "right",
                            color: (r?.porPagarMinor ?? 0) < 0 ? "#B23545" : "#0A2540"
                          }}
                        >
                          {r && r.porPagarMinor !== 0 ? (
                            formatoMonto(r.porPagarMinor, "COP")
                          ) : (
                            <span style={{ color: "#CBD5E1" }}>—</span>
                          )}
                        </td>
                        <td style={celda}>
                          {r?.tieneTarifa ? (
                            <span style={{ fontSize: "0.78rem", color: "#1C7A52" }}>sí</span>
                          ) : (
                            <Etiqueta texto="sin tarifa" tono="ambar" />
                          )}
                        </td>
                        <td style={celda}>
                          <Riesgo r={r} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#94A3B8", lineHeight: 1.6 }}>
            «Por pagar» en rojo es deuda: se le devolvió a un pagador dinero que ya se le había
            pagado al comercio, y se descuenta de su siguiente lote. El riesgo cuenta cuántas veces
            actuó el motor en 30 días y si hay dinero retenido hoy. Las acciones (claves, KYC,
            estado) están en la ficha.
          </p>
        </>
      )}
    </>
  );
}
