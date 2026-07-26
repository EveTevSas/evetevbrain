import { z } from "zod";

/** Onboarding de comercios (merchants) en EvePay. */

export const CrearMerchantInputSchema = z.object({
  legalName: z.string().min(1).max(200)
});
export type CrearMerchantInput = z.infer<typeof CrearMerchantInputSchema>;

export const EstadoMerchantSchema = z.enum([
  "pendiente",
  "en_revision",
  "aprobado",
  "rechazado"
]);
export type EstadoMerchant = z.infer<typeof EstadoMerchantSchema>;

export interface Merchant {
  id: string;
  legalName: string;
  estado: EstadoMerchant;
  creadoEn: string;
}

/** Resultado del alta del comercio en el proveedor (Akua). */
export interface ProviderMerchant {
  providerMerchantId: string;
  estado: EstadoMerchant;
}
