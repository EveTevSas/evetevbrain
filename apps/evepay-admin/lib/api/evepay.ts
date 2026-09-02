import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Cliente de la API de EvePay para la consola.
 *
 * Reenvía el JWT de la persona que tiene la sesión, no una credencial de
 * servicio: así la API verifica el rol en cada llamada y la auditoría puede
 * decir quién hizo qué (CA-3, CA-4). Una llave de servicio compartida haría
 * que todas las acciones parecieran del mismo actor.
 *
 * La consola NO tiene base de datos: todo lo administrable pasa por aquí.
 */

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

async function tokenDeSesion(): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ErrorApi("La sesión expiró. Vuelve a entrar.", 401);
  }
  return session.access_token;
}

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ErrorApi";
  }
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${baseUrl()}/v1${ruta}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await tokenDeSesion()}`,
        ...init?.headers
      },
      cache: "no-store"
    });
  } catch {
    // Distinguir "la API no responde" de "la API dijo que no" importa: lo
    // primero se arregla levantando el servicio, lo segundo cambiando la
    // petición. Un mensaje genérico haría perder ese tiempo.
    throw new ErrorApi(`No se pudo contactar la API de EvePay en ${baseUrl()}.`, 503);
  }

  if (!respuesta.ok) {
    throw new ErrorApi(await mensajeDeError(respuesta), respuesta.status);
  }
  return (await respuesta.json()) as T;
}

async function mensajeDeError(respuesta: Response): Promise<string> {
  if (respuesta.status === 403) return "Tu cuenta no tiene permisos para esta acción.";
  if (respuesta.status === 404) return "No se encontró el recurso.";
  try {
    const cuerpo = (await respuesta.json()) as { message?: unknown };
    if (typeof cuerpo.message === "string") return cuerpo.message;
  } catch {
    // cuerpo no-JSON: nos quedamos con el genérico de abajo
  }
  return `La API respondió ${respuesta.status}.`;
}

export function apiGet<T>(ruta: string): Promise<T> {
  return pedir<T>(ruta);
}

export function apiPost<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  return pedir<T>(ruta, {
    method: "POST",
    body: JSON.stringify(cuerpo ?? {})
  });
}

// --- Tipos del contrato con la API (espejo de apps/api) ---

export interface ApiKeyResumen {
  prefix: string;
  environment: string;
  activa: boolean;
}

export interface Comercio {
  tenantId: string;
  legalName: string;
  displayName: string;
  estado: string;
  creadoEn: string;
  merchantId?: string;
  merchantEstado?: string;
  apiKeys: ApiKeyResumen[];
}

export interface ComercioCreado {
  tenantId: string;
  merchantId: string;
  apiKey: string;
  testApiKey: string;
  pasoManualProveedor: string | null;
}

export interface ApiKeyRotada {
  tenantId: string;
  environment: string;
  apiKey: string;
  prefix: string;
  desactivadas: number;
}

export function listarComercios(): Promise<Comercio[]> {
  return apiGet<Comercio[]>("/admin/merchants");
}
