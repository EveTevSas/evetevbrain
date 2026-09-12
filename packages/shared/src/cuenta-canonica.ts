import { z } from "zod";

/**
 * Cuenta canónica de Evetev (docs/ARQUITECTURA_HUB_EVETEV.md §7).
 *
 * Un mismo cliente puede pagar mensualidad en un producto y procesar pagos con
 * EvePay. La Cuenta lo representa UNA vez y enlaza sus facetas. EvePay no
 * conoce esta entidad: la relación se lee desde arriba, por `evepayTenantId`.
 * Los datos viven en el Hub (`hub.cuentas`, `hub.enlaces_producto`); aquí
 * solo va el contrato, para que cualquier app hable el mismo idioma.
 */

export const ProductoEvetevSchema = z.enum(["evepay", "eveconecta", "eveledger"]);
export type ProductoEvetev = z.infer<typeof ProductoEvetevSchema>;

export const EstadoCuentaSchema = z.enum(["onboarding", "activa", "suspendida", "cerrada"]);
export type EstadoCuenta = z.infer<typeof EstadoCuentaSchema>;

export const EstadoSuscripcionSchema = z.enum(["activa", "morosa", "cancelada"]);
export type EstadoSuscripcion = z.infer<typeof EstadoSuscripcionSchema>;

/** Por qué puerta entró el cliente a EvePay. */
export const OrigenCuentaSchema = z.enum(["directo", "eveconecta", "eveledger"]);
export type OrigenCuenta = z.infer<typeof OrigenCuentaSchema>;

export const CuentaSchema = z.object({
  id: z.string().uuid(),
  nombreLegal: z.string().trim().min(3).max(200),
  /** NIT sin puntos; el dígito de verificación se valida con `nit.ts`. */
  nit: z.string().trim().min(5).max(20),
  estado: EstadoCuentaSchema,
  creadaEn: z.string().datetime()
});
export type Cuenta = z.infer<typeof CuentaSchema>;

export const EnlaceProductoSchema = z
  .object({
    accountId: z.string().uuid(),
    producto: ProductoEvetevSchema,
    /** Solo para productos con mensualidad. MRR en la unidad mínima (COP: pesos). */
    suscripcion: z
      .object({ estado: EstadoSuscripcionSchema, mrrMinor: z.number().int().nonnegative() })
      .optional(),
    /** La faceta de pagos: la cuenta ES tenant de EvePay. */
    evepayTenantId: z.string().uuid().optional(),
    origen: OrigenCuentaSchema
  })
  .refine((e) => e.suscripcion !== undefined || e.evepayTenantId !== undefined, {
    message: "Un enlace tiene mensualidad, faceta de pagos o ambas; vacío no dice nada."
  })
  .refine((e) => e.producto !== "evepay" || e.suscripcion === undefined, {
    message: "EvePay no cobra mensualidad: su enlace solo lleva evepayTenantId."
  });
export type EnlaceProducto = z.infer<typeof EnlaceProductoSchema>;

/**
 * Ingreso de una cuenta en el mes sin doble conteo (CA-2 de la arquitectura):
 * el MRR de sus suscripciones activas más la comisión que EvePay le cobró a su
 * tenant. La comisión llega ya calculada por EvePay; aquí no se recalcula.
 */
export function ingresoDeCuenta(
  enlaces: EnlaceProducto[],
  comisionPorTenantMinor: Record<string, number>
): { mrrMinor: number; comisionMinor: number; totalMinor: number } {
  let mrrMinor = 0;
  const tenants = new Set<string>();
  for (const e of enlaces) {
    if (e.suscripcion?.estado === "activa") mrrMinor += e.suscripcion.mrrMinor;
    if (e.evepayTenantId) tenants.add(e.evepayTenantId);
  }
  let comisionMinor = 0;
  for (const t of tenants) comisionMinor += comisionPorTenantMinor[t] ?? 0;
  return { mrrMinor, comisionMinor, totalMinor: mrrMinor + comisionMinor };
}
