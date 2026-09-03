"use client";

import { Campo, Casilla, Seccion, entrada } from "@/components/campos";
import { nitCoincideConDv } from "@evetev/shared";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

/**
 * Campos del perfil del comercio, repartidos en pasos.
 *
 * Qué se pide y por qué está en la migración 0012: es el conocimiento del
 * cliente que exige el marco de la Superintendencia Financiera, más lo que la
 * operación necesita para facturar, notificar y dispersar.
 */

export const PASOS = [
  "Identificación",
  "Ubicación y correos",
  "Personas",
  "Beneficiarios",
  "Dinero y documentos"
] as const;

const DEPARTAMENTOS = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada"
];

const BANCOS = [
  "Bancolombia",
  "Banco de Bogotá",
  "Davivienda",
  "BBVA Colombia",
  "Banco de Occidente",
  "Banco Popular",
  "Banco Caja Social",
  "Scotiabank Colpatria",
  "Banco Agrario",
  "Itaú",
  "Banco AV Villas",
  "Bancamía",
  "Banco Falabella",
  "Banco Pichincha",
  "Nequi",
  "Daviplata",
  "Lulo Bank",
  "Nubank"
];

/**
 * Qué campos exige cada paso antes de dejar avanzar. Se comprueba aquí y no
 * con `required` del navegador porque los pasos ocultos siguen en el DOM: el
 * navegador se negaría a enviar por un campo que no puede ni mostrar.
 */
export const REQUERIDOS_POR_PASO: string[][] = [
  ["legalName", "displayName", "numeroDocumento"],
  ["direccion", "ciudad", "departamento", "correoNotificaciones", "correoFacturacion"],
  ["repNombre", "repNumeroDocumento", "contactoNombre", "contactoCorreo"],
  [],
  []
];

const ETIQUETAS: Record<string, string> = {
  legalName: "Razón social",
  displayName: "Nombre visible",
  numeroDocumento: "Número de documento",
  direccion: "Dirección",
  ciudad: "Ciudad",
  departamento: "Departamento",
  correoNotificaciones: "Correo de notificaciones",
  correoFacturacion: "Correo de facturación",
  repNombre: "Nombre del representante legal",
  repNumeroDocumento: "Documento del representante legal",
  contactoNombre: "Nombre de la persona de contacto",
  contactoCorreo: "Correo de la persona de contacto"
};

/**
 * Valida el paso contra el formulario real. Devuelve el primer problema, o
 * null si puede avanzar.
 */
export function validarPaso(paso: number, form: HTMLFormElement): string | null {
  const valor = (n: string) => String(new FormData(form).get(n) ?? "").trim();

  for (const campo of REQUERIDOS_POR_PASO[paso] ?? []) {
    if (valor(campo) === "") {
      return `Falta ${ETIQUETAS[campo] ?? campo}.`;
    }
  }

  if (paso === 0) {
    // Se avisa aquí y no al final: descubrir en el paso 5 que el NIT estaba
    // mal desde el 1 obliga a recorrer todo el formulario de vuelta.
    if (
      valor("tipoDocumento") === "NIT" &&
      !nitCoincideConDv(valor("numeroDocumento"), valor("digitoVerificacion"))
    ) {
      return "El dígito de verificación no corresponde al NIT.";
    }
  }

  if (paso === 1) {
    for (const c of ["correoNotificaciones", "correoFacturacion"]) {
      if (!valor(c).includes("@")) return `${ETIQUETAS[c]} no parece un correo.`;
    }
  }

  if (paso === 2 && !valor("contactoCorreo").includes("@")) {
    return "El correo de la persona de contacto no parece un correo.";
  }

  if (paso === 3 && valor("tipoPersona") === "juridica" && valor("ben_nombre_0") === "") {
    return "Una persona jurídica debe declarar al menos un beneficiario final.";
  }

  if (paso === 4) {
    const cuenta = ["banco", "tipoCuenta", "numeroCuenta"].filter((c) => valor(c) !== "");
    if (cuenta.length > 0 && cuenta.length < 3) {
      return "Para dispersar hacen falta banco, tipo de cuenta y número; o los tres o ninguno.";
    }
    const titular = valor("titularDocumento").replace(/[.\s-]/g, "");
    const propio = valor("numeroDocumento").replace(/[.\s-]/g, "");
    if (titular !== "" && titular !== propio) {
      return "El documento del titular de la cuenta no coincide con el del comercio.";
    }
  }

  return null;
}

export function CamposPaso({
  paso,
  inicial,
  tipoPersona,
  onTipoPersona,
  conIdentidadDelTenant = true
}: {
  paso: number;
  inicial?: Record<string, unknown>;
  /**
   * Vive en el componente padre, no aquí. Cada paso es una instancia distinta:
   * con el estado dentro, elegir "persona natural" en el paso 1 no llegaba al
   * paso 4, que seguía exigiendo beneficiarios finales.
   */
  tipoPersona: string;
  onTipoPersona: (v: string) => void;
  /** El alta pide razón social y nombre visible; la edición del perfil, no. */
  conIdentidadDelTenant?: boolean;
}) {
  const v = (k: string) => (inicial?.[k] as string | undefined) ?? "";
  const bool = (k: string) => Boolean(inicial?.[k]);

  const [filas, setFilas] = useState(1);

  switch (paso) {
    case 0:
      return (
        <Seccion
          titulo="Identificación"
          descripcion="Como figura en el RUT. El dígito de verificación se comprueba contra el NIT."
        >
          {conIdentidadDelTenant && (
            <>
              <Campo etiqueta="Razón social" requerido>
                <input name="legalName" minLength={3} style={entrada} />
              </Campo>
              <Campo etiqueta="Nombre visible" requerido ayuda="Como se verá en la consola">
                <input name="displayName" minLength={2} style={entrada} />
              </Campo>
            </>
          )}

          <Campo etiqueta="Tipo de persona" requerido>
            <select
              name="tipoPersona"
              value={tipoPersona}
              onChange={(e) => onTipoPersona(e.target.value)}
              style={entrada}
            >
              <option value="juridica">Persona jurídica</option>
              <option value="natural">Persona natural</option>
            </select>
          </Campo>

          <Campo etiqueta="Tipo de documento" requerido>
            <select
              name="tipoDocumento"
              defaultValue={v("tipo_documento") || "NIT"}
              style={entrada}
            >
              <option value="NIT">NIT</option>
              <option value="CC">Cédula de ciudadanía</option>
              <option value="CE">Cédula de extranjería</option>
              <option value="PA">Pasaporte</option>
            </select>
          </Campo>

          <Campo etiqueta="Número" requerido>
            <input name="numeroDocumento" defaultValue={v("numero_documento")} style={entrada} />
          </Campo>

          <Campo etiqueta="Dígito de verificación" ayuda="Solo para NIT">
            <input
              name="digitoVerificacion"
              defaultValue={v("digito_verificacion")}
              maxLength={1}
              inputMode="numeric"
              style={entrada}
            />
          </Campo>

          <Campo etiqueta="Nombre comercial" ayuda="Si difiere de la razón social">
            <input name="nombreComercial" defaultValue={v("nombre_comercial")} style={entrada} />
          </Campo>

          <Campo etiqueta="Código CIIU" ayuda="Actividad económica, del RUT">
            <input name="ciiu" defaultValue={v("ciiu")} style={entrada} />
          </Campo>

          <Casilla
            etiqueta="Responsable de IVA"
            nombre="responsableIva"
            defecto={bool("responsable_iva")}
            ayuda="Cambia cómo se le factura"
          />
        </Seccion>
      );

    case 1:
      return (
        <>
          <Seccion titulo="Domicilio">
            <Campo etiqueta="Dirección" requerido>
              <input name="direccion" defaultValue={v("direccion")} style={entrada} />
            </Campo>
            <Campo etiqueta="Ciudad" requerido>
              <input name="ciudad" defaultValue={v("ciudad")} style={entrada} />
            </Campo>
            <Campo etiqueta="Departamento" requerido>
              <select name="departamento" defaultValue={v("departamento")} style={entrada}>
                <option value="">Selecciona…</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Teléfono">
              <input name="telefono" defaultValue={v("telefono")} style={entrada} />
            </Campo>
            <Campo etiqueta="Sitio web">
              <input name="sitioWeb" defaultValue={v("sitio_web")} style={entrada} />
            </Campo>
          </Seccion>

          <div style={{ height: "1.1rem" }} />

          <Seccion
            titulo="Correos"
            descripcion="Van separados a propósito: los avisos operativos que llegan a contabilidad no los lee nadie."
          >
            <Campo
              etiqueta="Correo de notificaciones"
              requerido
              ayuda="Cobros, fallos y cambios de estado"
            >
              <input
                type="email"
                name="correoNotificaciones"
                defaultValue={v("correo_notificaciones")}
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Correo de facturación" requerido ayuda="Aquí llega la cuenta de cobro">
              <input
                type="email"
                name="correoFacturacion"
                defaultValue={v("correo_facturacion")}
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Dirección de facturación" ayuda="Solo si difiere del domicilio">
              <input
                name="direccionFacturacion"
                defaultValue={v("direccion_facturacion")}
                style={entrada}
              />
            </Campo>
          </Seccion>
        </>
      );

    case 2:
      return (
        <>
          <Seccion titulo="Representante legal" descripcion="Quien firma por el comercio.">
            <Campo etiqueta="Nombre completo" requerido>
              <input name="repNombre" defaultValue={v("rep_nombre")} style={entrada} />
            </Campo>
            <Campo etiqueta="Tipo de documento" requerido>
              <select
                name="repTipoDocumento"
                defaultValue={v("rep_tipo_documento") || "CC"}
                style={entrada}
              >
                <option value="CC">Cédula de ciudadanía</option>
                <option value="CE">Cédula de extranjería</option>
                <option value="PA">Pasaporte</option>
              </select>
            </Campo>
            <Campo etiqueta="Número de documento" requerido>
              <input
                name="repNumeroDocumento"
                defaultValue={v("rep_numero_documento")}
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Correo">
              <input type="email" name="repCorreo" defaultValue={v("rep_correo")} style={entrada} />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input name="repTelefono" defaultValue={v("rep_telefono")} style={entrada} />
            </Campo>
            <Casilla
              etiqueta="Es persona expuesta políticamente (PEP)"
              nombre="repEsPep"
              defecto={bool("rep_es_pep")}
              ayuda="No descalifica: obliga a diligencia reforzada"
            />
          </Seccion>

          <div style={{ height: "1.1rem" }} />

          <Seccion
            titulo="Persona de contacto"
            descripcion="A quién se llama cuando algo falla. Rara vez es el representante legal."
          >
            <Campo etiqueta="Nombre" requerido>
              <input name="contactoNombre" defaultValue={v("contacto_nombre")} style={entrada} />
            </Campo>
            <Campo etiqueta="Cargo">
              <input name="contactoCargo" defaultValue={v("contacto_cargo")} style={entrada} />
            </Campo>
            <Campo etiqueta="Correo" requerido>
              <input
                type="email"
                name="contactoCorreo"
                defaultValue={v("contacto_correo")}
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input
                name="contactoTelefono"
                defaultValue={v("contacto_telefono")}
                style={entrada}
              />
            </Campo>
          </Seccion>
        </>
      );

    case 3:
      return (
        <Beneficiarios
          filas={filas}
          setFilas={setFilas}
          previos={inicial?.beneficiarios as Record<string, unknown>[] | undefined}
          esJuridica={tipoPersona === "juridica"}
        />
      );

    case 4:
      return (
        <>
          <Seccion
            titulo="Cuenta para la dispersión"
            descripcion="Donde se le gira lo recaudado. Debe estar a nombre del comercio: no se dispersa a cuentas de terceros."
          >
            <Campo etiqueta="Banco">
              <select name="banco" defaultValue={v("banco")} style={entrada}>
                <option value="">Selecciona…</option>
                {BANCOS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Tipo de cuenta">
              <select name="tipoCuenta" defaultValue={v("tipo_cuenta")} style={entrada}>
                <option value="">Selecciona…</option>
                <option value="ahorros">Ahorros</option>
                <option value="corriente">Corriente</option>
              </select>
            </Campo>
            <Campo etiqueta="Número de cuenta">
              <input name="numeroCuenta" defaultValue={v("numero_cuenta")} style={entrada} />
            </Campo>
            <Campo etiqueta="Titular">
              <input name="titularCuenta" defaultValue={v("titular_cuenta")} style={entrada} />
            </Campo>
            <Campo etiqueta="Documento del titular" ayuda="Debe coincidir con el del comercio">
              <input
                name="titularDocumento"
                defaultValue={v("titular_documento")}
                style={entrada}
              />
            </Campo>
          </Seccion>

          <div style={{ height: "1.1rem" }} />

          <Seccion
            titulo="Documentos verificados"
            descripcion="No se suben archivos: se registra que alguien los revisó, cuándo y quién."
          >
            <Casilla etiqueta="RUT" nombre="rutVerificado" defecto={bool("rut_verificado")} />
            <Casilla
              etiqueta="Cámara de comercio"
              nombre="camaraComercioVerificada"
              defecto={bool("camara_comercio_verificada")}
              ayuda="Con menos de 90 días"
            />
            <Casilla
              etiqueta="Cédula del representante"
              nombre="cedulaRepVerificada"
              defecto={bool("cedula_rep_verificada")}
            />
            <Casilla
              etiqueta="Certificación bancaria"
              nombre="certificacionBancariaVerificada"
              defecto={bool("certificacion_bancaria_verificada")}
            />
          </Seccion>
        </>
      );

    default:
      return null;
  }
}

function Beneficiarios({
  filas,
  setFilas,
  previos,
  esJuridica
}: {
  filas: number;
  setFilas: (n: number) => void;
  previos?: Record<string, unknown>[];
  esJuridica: boolean;
}) {
  const anteriores = previos ?? [];
  const total = Math.max(filas, anteriores.length);

  return (
    <fieldset
      style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "1.1rem 1.2rem", margin: 0 }}
    >
      <legend
        style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4b3075", padding: "0 0.4rem" }}
      >
        Beneficiarios finales
      </legend>
      <p style={{ margin: "0 0 1rem", fontSize: "0.76rem", color: "#64748B", lineHeight: 1.55 }}>
        Quien tiene el 5% o más del capital o de los derechos de voto, o control efectivo aunque no
        figure como dueño.{" "}
        {esJuridica ? (
          <strong>Una persona jurídica debe declarar al menos uno.</strong>
        ) : (
          "Una persona natural es su propio beneficiario: este paso se puede dejar vacío."
        )}
      </p>

      {Array.from({ length: total }, (_, i) => {
        const p = anteriores[i];
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 0.9fr 1.3fr 0.7fr auto",
              gap: "0.6rem",
              alignItems: "end",
              marginBottom: "0.8rem"
            }}
          >
            <Campo etiqueta="Nombre">
              <input
                name={`ben_nombre_${i}`}
                defaultValue={(p?.nombre as string) ?? ""}
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="Doc.">
              <select
                name={`ben_tipoDocumento_${i}`}
                defaultValue={(p?.tipo_documento as string) ?? "CC"}
                style={entrada}
              >
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="PA">PA</option>
                <option value="NIT">NIT</option>
              </select>
            </Campo>
            <Campo etiqueta="Número">
              <input
                name={`ben_numeroDocumento_${i}`}
                defaultValue={(p?.numero_documento as string) ?? ""}
                style={entrada}
              />
            </Campo>
            <Campo etiqueta="% part.">
              <input
                name={`ben_participacion_${i}`}
                defaultValue={(p?.participacion as string) ?? ""}
                inputMode="decimal"
                style={entrada}
              />
            </Campo>
            <div style={{ paddingBottom: "0.35rem", display: "flex", gap: "0.4rem" }}>
              <Casilla etiqueta="PEP" nombre={`ben_esPep_${i}`} defecto={Boolean(p?.es_pep)} />
              {total > 1 && i === total - 1 && (
                <button
                  type="button"
                  onClick={() => setFilas(total - 1)}
                  aria-label="Quitar el último beneficiario"
                  style={{
                    border: "1px solid #E2E8F0",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "0.4rem",
                    cursor: "pointer",
                    color: "#B91C1C"
                  }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setFilas(total + 1)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          border: "1px solid #E2E8F0",
          background: "#fff",
          borderRadius: 8,
          padding: "0.4rem 0.7rem",
          fontSize: "0.78rem",
          fontWeight: 600,
          color: "#4b3075",
          cursor: "pointer"
        }}
      >
        <Plus size={13} />
        Agregar beneficiario
      </button>
    </fieldset>
  );
}
