import { Tarjeta, TituloSeccion } from "@/components/seccion";
import {
  ErrorApi,
  obtenerComercio,
  obtenerPerfil,
  type Comercio,
  type PerfilGuardado
} from "@/lib/api/evepay";
import { ArrowLeft, CircleAlert } from "lucide-react";
import Link from "next/link";
import { AccionesComercio } from "../acciones-comercio";
import { EditarPerfil } from "./editar-perfil";

export const dynamic = "force-dynamic";

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{ fontSize: "0.67rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}
      >
        {etiqueta.toUpperCase()}
      </div>
      <div style={{ fontSize: "0.85rem", color: "#0A2540", marginTop: "0.15rem" }}>
        {children || <span style={{ color: "#CBD5E1" }}>—</span>}
      </div>
    </div>
  );
}

function Rejilla({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
        gap: "1.1rem"
      }}
    >
      {children}
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.6rem" }}>
      <h3
        style={{
          margin: "0 0 0.8rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "#4b3075",
          letterSpacing: "0.04em"
        }}
      >
        {titulo.toUpperCase()}
      </h3>
      {children}
    </div>
  );
}

function Si({ valor }: { valor: unknown }) {
  return <>{valor ? "Sí" : "No"}</>;
}

export default async function FichaComercioPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  let comercio: Comercio | null = null;
  let datos: PerfilGuardado | null = null;
  let error: string | null = null;

  try {
    [comercio, datos] = await Promise.all([obtenerComercio(tenantId), obtenerPerfil(tenantId)]);
  } catch (e) {
    error = e instanceof ErrorApi ? e.message : "No se pudo cargar el comercio.";
  }

  if (error || !comercio) {
    return (
      <>
        <TituloSeccion titulo="Comercio" descripcion="Ficha del comercio." />
        <Tarjeta>
          <p
            style={{ margin: "0 0 0.6rem", fontSize: "0.87rem", color: "#B91C1C", fontWeight: 600 }}
          >
            {error}
          </p>
          <Link href="/comercios" style={{ fontSize: "0.83rem", color: "#4b3075" }}>
            ← Volver al listado
          </Link>
        </Tarjeta>
      </>
    );
  }

  const p = datos?.perfil ?? null;
  const beneficiarios = datos?.beneficiarios ?? [];
  const t = (k: string) => (p?.[k] as string | null) ?? "";
  const activo = comercio.estado === "activo";
  const puedeCobrar = activo && comercio.merchantEstado === "aprobado";

  return (
    <>
      <Link
        href="/comercios"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          fontSize: "0.8rem",
          color: "#64748B",
          textDecoration: "none",
          marginBottom: "0.75rem"
        }}
      >
        <ArrowLeft size={14} />
        Comercios
      </Link>

      <TituloSeccion
        titulo={comercio.displayName}
        descripcion={`${comercio.legalName}${comercio.documento ? ` · ${comercio.documento}` : ""}`}
      />

      {!puedeCobrar && (
        <div
          role="status"
          style={{
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 12,
            padding: "0.85rem 1.05rem",
            marginBottom: "1.2rem",
            display: "flex",
            gap: "0.55rem",
            alignItems: "flex-start"
          }}
        >
          <CircleAlert size={16} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#78350F", lineHeight: 1.5 }}>
            <strong>Este comercio no puede cobrar todavía.</strong>{" "}
            {!activo
              ? "Está desactivado."
              : `Su KYC está en "${comercio.merchantEstado ?? "sin comercio"}": hay que aprobarlo una vez registrado en el panel del proveedor.`}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Tarjeta>
          <Bloque titulo="Estado">
            <Rejilla>
              <Dato etiqueta="Comercio">{comercio.estado}</Dato>
              <Dato etiqueta="KYC">{comercio.merchantEstado ?? "sin comercio"}</Dato>
              <Dato etiqueta="Alta">{new Date(comercio.creadoEn).toLocaleDateString("es-CO")}</Dato>
              <Dato etiqueta="Tenant">
                <code style={{ fontSize: "0.72rem", fontFamily: "ui-monospace, Menlo, monospace" }}>
                  {comercio.tenantId}
                </code>
              </Dato>
            </Rejilla>
          </Bloque>

          <Bloque titulo="API keys">
            {comercio.apiKeys.length === 0 ? (
              <span style={{ fontSize: "0.82rem", color: "#94A3B8" }}>Sin claves.</span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {comercio.apiKeys.map((k) => (
                  <div
                    key={`${k.prefix}-${k.environment}`}
                    style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                  >
                    <code
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "ui-monospace, Menlo, monospace",
                        color: k.activa ? "#0A2540" : "#94A3B8",
                        textDecoration: k.activa ? "none" : "line-through"
                      }}
                    >
                      {k.prefix}…
                    </code>
                    <span style={{ fontSize: "0.72rem", color: "#64748B" }}>{k.environment}</span>
                    {!k.activa && (
                      <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>revocada</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Bloque>

          <AccionesComercio
            tenantId={comercio.tenantId}
            nombre={comercio.displayName}
            activo={activo}
            kyc={comercio.merchantEstado}
          />
        </Tarjeta>

        <Tarjeta>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.3rem",
              flexWrap: "wrap"
            }}
          >
            <h2 style={{ margin: 0, fontSize: "0.98rem", color: "#0A2540" }}>Datos del comercio</h2>
            <EditarPerfil tenantId={comercio.tenantId} perfil={p} beneficiarios={beneficiarios} />
          </div>

          {!p ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748B", lineHeight: 1.6 }}>
              Este comercio se creó antes de que se pidiera el perfil. Sin estos datos no se le
              puede facturar ni dispersar lo recaudado.
            </p>
          ) : (
            <>
              <Bloque titulo="Identificación">
                <Rejilla>
                  <Dato etiqueta="Tipo de persona">{t("tipo_persona")}</Dato>
                  <Dato etiqueta="Documento">
                    {t("tipo_documento")} {t("numero_documento")}
                    {t("digito_verificacion") ? `-${t("digito_verificacion")}` : ""}
                  </Dato>
                  <Dato etiqueta="Nombre comercial">{t("nombre_comercial")}</Dato>
                  <Dato etiqueta="CIIU">{t("ciiu")}</Dato>
                  <Dato etiqueta="Responsable de IVA">
                    <Si valor={p.responsable_iva} />
                  </Dato>
                </Rejilla>
              </Bloque>

              <Bloque titulo="Domicilio y contacto">
                <Rejilla>
                  <Dato etiqueta="Dirección">{t("direccion")}</Dato>
                  <Dato etiqueta="Ciudad">{t("ciudad")}</Dato>
                  <Dato etiqueta="Departamento">{t("departamento")}</Dato>
                  <Dato etiqueta="Teléfono">{t("telefono")}</Dato>
                  <Dato etiqueta="Sitio web">{t("sitio_web")}</Dato>
                  <Dato etiqueta="Correo de notificaciones">{t("correo_notificaciones")}</Dato>
                  <Dato etiqueta="Correo de facturación">{t("correo_facturacion")}</Dato>
                  <Dato etiqueta="Dirección de facturación">{t("direccion_facturacion")}</Dato>
                </Rejilla>
              </Bloque>

              <Bloque titulo="Representante legal">
                <Rejilla>
                  <Dato etiqueta="Nombre">{t("rep_nombre")}</Dato>
                  <Dato etiqueta="Documento">
                    {t("rep_tipo_documento")} {t("rep_numero_documento")}
                  </Dato>
                  <Dato etiqueta="Correo">{t("rep_correo")}</Dato>
                  <Dato etiqueta="Teléfono">{t("rep_telefono")}</Dato>
                  <Dato etiqueta="PEP">
                    <Si valor={p.rep_es_pep} />
                  </Dato>
                </Rejilla>
              </Bloque>

              <Bloque titulo="Persona de contacto">
                <Rejilla>
                  <Dato etiqueta="Nombre">{t("contacto_nombre")}</Dato>
                  <Dato etiqueta="Cargo">{t("contacto_cargo")}</Dato>
                  <Dato etiqueta="Correo">{t("contacto_correo")}</Dato>
                  <Dato etiqueta="Teléfono">{t("contacto_telefono")}</Dato>
                </Rejilla>
              </Bloque>

              <Bloque titulo="Beneficiarios finales">
                {beneficiarios.length === 0 ? (
                  <span style={{ fontSize: "0.82rem", color: "#94A3B8" }}>Ninguno declarado.</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {beneficiarios.map((b, i) => (
                      <div key={i} style={{ fontSize: "0.83rem", color: "#0A2540" }}>
                        {String(b.nombre)}{" "}
                        <span style={{ color: "#64748B" }}>
                          · {String(b.tipo_documento)} {String(b.numero_documento)}
                          {b.participacion != null && ` · ${String(b.participacion)}%`}
                        </span>
                        {b.es_pep ? (
                          <strong style={{ color: "#B45309", fontSize: "0.75rem" }}> PEP</strong>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </Bloque>

              <Bloque titulo="Cuenta para la dispersión">
                <Rejilla>
                  <Dato etiqueta="Banco">{t("banco")}</Dato>
                  <Dato etiqueta="Tipo de cuenta">{t("tipo_cuenta")}</Dato>
                  <Dato etiqueta="Número">{t("numero_cuenta")}</Dato>
                  <Dato etiqueta="Titular">{t("titular_cuenta")}</Dato>
                  <Dato etiqueta="Documento del titular">{t("titular_documento")}</Dato>
                </Rejilla>
              </Bloque>

              <Bloque titulo="Documentos verificados">
                <Rejilla>
                  <Dato etiqueta="RUT">
                    <Si valor={p.rut_verificado} />
                  </Dato>
                  <Dato etiqueta="Cámara de comercio">
                    <Si valor={p.camara_comercio_verificada} />
                  </Dato>
                  <Dato etiqueta="Cédula del representante">
                    <Si valor={p.cedula_rep_verificada} />
                  </Dato>
                  <Dato etiqueta="Certificación bancaria">
                    <Si valor={p.certificacion_bancaria_verificada} />
                  </Dato>
                  <Dato etiqueta="Verificado por">
                    {t("verificado_por")}
                    {p.verificado_en
                      ? ` · ${new Date(String(p.verificado_en)).toLocaleDateString("es-CO")}`
                      : ""}
                  </Dato>
                </Rejilla>
              </Bloque>
            </>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
