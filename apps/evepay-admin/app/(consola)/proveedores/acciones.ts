"use server";

import { apiPost, ErrorApi, type SaludProveedor } from "@/lib/api/evepay";

export type ResultadoSalud = { ok: true; datos: SaludProveedor } | { ok: false; error: string };

/**
 * Dispara la comprobación real contra el proveedor activo (CA-12). No lanza:
 * un proveedor caído es información que la página debe mostrar, no un error
 * que tumbe la sección de proveedores —que es justo donde se va a mirar
 * cuando algo va mal—.
 */
export async function comprobarSalud(): Promise<ResultadoSalud> {
  try {
    return { ok: true, datos: await apiPost<SaludProveedor>("/admin/providers/health") };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ErrorApi ? error.message : "No se pudo ejecutar la comprobación."
    };
  }
}
