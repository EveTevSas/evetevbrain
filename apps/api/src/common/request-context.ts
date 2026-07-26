import { AsyncLocalStorage } from "node:async_hooks";

/** Contexto por request: quién (tenant/actor) y con qué rol (§4 multi-tenant + RBAC). */
export interface RequestContext {
  /** Tenant = comercio de EvePay. Base del aislamiento (RLS). */
  tenantId: string;
  /** Identificador del actor para auditoría (nunca PII). */
  actor: string;
  /** Rol RBAC del actor. */
  role: string;
}

export const requestStorage = new AsyncLocalStorage<RequestContext>();

/** Contexto actual; lanza si no fue establecido por el middleware. */
export function currentContext(): RequestContext {
  const ctx = requestStorage.getStore();
  if (!ctx) {
    throw new Error("Sin contexto de request (¿falta TenantMiddleware?).");
  }
  return ctx;
}
