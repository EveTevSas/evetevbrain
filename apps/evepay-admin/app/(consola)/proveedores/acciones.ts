"use server";

import { revalidatePath } from "next/cache";
import { validarTarifaProveedor } from "@evetev/shared";
import {
  apiPost,
  apiPut,
  ErrorApi,
  type SaludProveedor,
  type VersionTarifaProveedor
} from "@/lib/api/evepay";
import { describirErrores, leerTarifaProveedor } from "@/lib/tarifas";

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

export type ResultadoTarifa =
  { ok: true; datos: VersionTarifaProveedor } | { ok: false; error: string };

/**
 * Agrega una versión de la tarifa que el proveedor le cobra a EvePay. Afecta a
 * todos los comercios desde el siguiente cobro; por eso el formulario avisa
 * antes a cuántos les quedaría margen negativo.
 */
export async function asignarTarifaProveedor(
  provider: string,
  formulario: FormData
): Promise<ResultadoTarifa> {
  const validacion = validarTarifaProveedor(leerTarifaProveedor(formulario));
  if (!validacion.ok) {
    return { ok: false, error: describirErrores(validacion.errores) };
  }

  try {
    const datos = await apiPut<VersionTarifaProveedor>(
      `/admin/providers/${encodeURIComponent(provider)}/tarifa`,
      validacion.tarifa
    );
    revalidatePath("/proveedores");
    revalidatePath("/comercios");
    return { ok: true, datos };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ErrorApi ? error.message : "No se pudo guardar la tarifa."
    };
  }
}
