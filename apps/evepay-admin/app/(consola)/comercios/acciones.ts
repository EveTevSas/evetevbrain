"use server";

import { revalidatePath } from "next/cache";
import {
  apiPost,
  apiPut,
  ErrorApi,
  type ApiKeyRotada,
  type ComercioCreado,
  type PerfilComercio
} from "@/lib/api/evepay";

/**
 * Server Actions de la sección de comercios. Cada una devuelve un resultado
 * discriminado en vez de lanzar: el formulario tiene que poder mostrar el error
 * sin perder lo que la persona ya escribió.
 */

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

function comoResultado<T>(error: unknown): Resultado<T> {
  if (error instanceof ErrorApi) return { ok: false, error: error.message };
  return { ok: false, error: "Ocurrió un error inesperado." };
}

/**
 * Lee el perfil del FormData. No revalida aquí lo que la API ya valida (el
 * dígito del NIT, el titular de la cuenta, los beneficiarios): duplicar reglas
 * de dinero en dos sitios garantiza que un día dejen de coincidir. Esto solo
 * traduce el formulario al contrato.
 */
function leerPerfil(f: FormData): PerfilComercio {
  const t = (k: string) => String(f.get(k) ?? "").trim();
  const b = (k: string) => f.get(k) === "on";

  const beneficiarios = [];
  for (let i = 0; f.get(`ben_nombre_${i}`) !== null; i++) {
    const nombre = t(`ben_nombre_${i}`);
    if (!nombre) continue;
    const part = t(`ben_participacion_${i}`);
    beneficiarios.push({
      nombre,
      tipoDocumento: (t(`ben_tipoDocumento_${i}`) || "CC") as "CC" | "CE" | "PA" | "NIT",
      numeroDocumento: t(`ben_numeroDocumento_${i}`),
      participacion: part === "" ? undefined : Number(part),
      esPep: b(`ben_esPep_${i}`)
    });
  }

  return {
    tipoPersona: (t("tipoPersona") || "juridica") as "natural" | "juridica",
    nombreComercial: t("nombreComercial"),
    tipoDocumento: (t("tipoDocumento") || "NIT") as "NIT" | "CC" | "CE" | "PA",
    numeroDocumento: t("numeroDocumento"),
    digitoVerificacion: t("digitoVerificacion"),
    ciiu: t("ciiu"),
    responsableIva: b("responsableIva"),
    direccion: t("direccion"),
    ciudad: t("ciudad"),
    departamento: t("departamento"),
    telefono: t("telefono"),
    sitioWeb: t("sitioWeb"),
    correoNotificaciones: t("correoNotificaciones"),
    correoFacturacion: t("correoFacturacion"),
    direccionFacturacion: t("direccionFacturacion"),
    repNombre: t("repNombre"),
    repTipoDocumento: (t("repTipoDocumento") || "CC") as "CC" | "CE" | "PA",
    repNumeroDocumento: t("repNumeroDocumento"),
    repCorreo: t("repCorreo"),
    repTelefono: t("repTelefono"),
    repEsPep: b("repEsPep"),
    contactoNombre: t("contactoNombre"),
    contactoCargo: t("contactoCargo"),
    contactoCorreo: t("contactoCorreo"),
    contactoTelefono: t("contactoTelefono"),
    banco: t("banco"),
    tipoCuenta: (t("tipoCuenta") || undefined) as "ahorros" | "corriente" | undefined,
    numeroCuenta: t("numeroCuenta"),
    titularCuenta: t("titularCuenta"),
    titularDocumento: t("titularDocumento"),
    rutVerificado: b("rutVerificado"),
    camaraComercioVerificada: b("camaraComercioVerificada"),
    cedulaRepVerificada: b("cedulaRepVerificada"),
    certificacionBancariaVerificada: b("certificacionBancariaVerificada"),
    beneficiarios
  };
}

export async function crearComercio(
  _estadoPrevio: Resultado<ComercioCreado> | null,
  formulario: FormData
): Promise<Resultado<ComercioCreado>> {
  const legalName = String(formulario.get("legalName") ?? "").trim();
  const displayName = String(formulario.get("displayName") ?? "").trim();

  if (legalName.length < 3) {
    return { ok: false, error: "La razón social debe tener al menos 3 caracteres." };
  }
  if (displayName.length < 2) {
    return { ok: false, error: "El nombre visible debe tener al menos 2 caracteres." };
  }

  try {
    const datos = await apiPost<ComercioCreado>("/admin/merchants", {
      legalName,
      displayName,
      perfil: leerPerfil(formulario)
    });
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error);
  }
}

/** Crea o reemplaza el perfil de un comercio ya existente. */
export async function guardarPerfil(
  tenantId: string,
  formulario: FormData
): Promise<Resultado<{ ok: true }>> {
  try {
    const datos = await apiPut<{ ok: true }>(
      `/admin/merchants/${tenantId}/perfil`,
      leerPerfil(formulario)
    );
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error);
  }
}

export async function rotarApiKey(
  tenantId: string,
  environment: "live" | "test"
): Promise<Resultado<ApiKeyRotada>> {
  try {
    const datos = await apiPost<ApiKeyRotada>(`/admin/merchants/${tenantId}/api-keys/rotate`, {
      environment
    });
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error);
  }
}

export async function cambiarEstadoComercio(
  tenantId: string,
  activo: boolean
): Promise<Resultado<{ tenantId: string; estado: string }>> {
  try {
    const datos = await apiPost<{ tenantId: string; estado: string }>(
      `/admin/merchants/${tenantId}/estado`,
      { activo }
    );
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error);
  }
}

/**
 * Aprueba o rechaza el KYC del comercio (CA-22). Con un proveedor agregador
 * este es el único camino: nadie va a mandar un evento diciendo que ya se
 * registró en su panel. Y desde que cobrar exige estar aprobado, es también
 * lo que habilita al comercio a cobrar.
 */
export async function cambiarKyc(
  tenantId: string,
  estado: "aprobado" | "rechazado"
): Promise<Resultado<{ tenantId: string; merchantId: string; estado: string }>> {
  try {
    const datos = await apiPost<{ tenantId: string; merchantId: string; estado: string }>(
      `/admin/merchants/${tenantId}/kyc`,
      { estado }
    );
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return comoResultado(error);
  }
}
