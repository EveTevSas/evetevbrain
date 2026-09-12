import "server-only";

import { sesionActual } from "@/lib/auth/sesion";

/**
 * Roll-ups de EvePay por HTTP, con el JWT de la persona (su rol interno decide
 * qué puede ver allá). El Hub nunca toca las tablas de EvePay (§6). Si la API
 * no responde, se devuelve null y las vistas lo dicen (CA-8).
 */
export interface ResumenEvepay {
  volumenHoyMinor: number;
  cobrosHoy: number;
  volumenMesMinor: number;
  cobrosMes: number;
  aprobacionMesPct: number | null;
  comisionMesMinor: number;
  costoMesMinor: number;
  margenMesMinor: number;
  ivaMesMinor: number;
  porPagarMinor: number;
  retenidoMinor: number;
  enRecaudoMinor: number;
  lotesAbiertos: number;
  colaRiesgo: number;
  comerciosActivos: number;
  comerciosSinTarifa: number;
  comerciosSinKyc: number;
  asientosDescuadrados: number;
}

export interface ComercioEvepay {
  tenantId: string;
  displayName: string;
  legalName: string;
  estado: string;
  documento: string | null;
}

async function apiGet<T>(path: string): Promise<T | null> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const { accessToken } = await sesionActual();
  if (!base || !accessToken) return null;
  try {
    const r = await fetch(`${base}/v1${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6000)
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const resumenEvepay = () => apiGet<ResumenEvepay>("/admin/resumen");
export const comerciosEvepay = () => apiGet<ComercioEvepay[]>("/admin/merchants");
