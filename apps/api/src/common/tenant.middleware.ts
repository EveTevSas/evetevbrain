import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { requestStorage, type RequestContext } from "./request-context";
import { hashApiKey } from "./api-key.util";
import { DB, type Db } from "../database/drizzle";
import { Role } from "../modules/identidad/roles";
import { pareceJwt, verificarJwtSupabase } from "../modules/identidad/supabase-jwt";

interface RequestLike {
  header(name: string): string | undefined;
}

/**
 * Establece el contexto por request (tenant/actor/rol) en AsyncLocalStorage.
 *
 * Flujo principal: `Authorization: Bearer evpk_*` → hash → lookup vía función
 * SECURITY DEFINER (bypasa RLS — necesario porque el tenant aún no está seteado).
 * Fallback (uso interno): headers `X-Tenant-Id` / `X-Actor` / `X-Role`.
 * La presencia y validez del tenant las exige RolesGuard en cada endpoint.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(@Inject(DB) private readonly db: Db | null) {}

  async use(req: RequestLike, _res: unknown, next: (error?: unknown) => void): Promise<void> {
    const auth = (req.header("authorization") ?? "").trim();

    if (auth.startsWith("Bearer evpk_") && this.db) {
      const key = auth.slice("Bearer ".length);
      const hash = hashApiKey(key);

      // Usamos la función SECURITY DEFINER para buscar la key SIN filtro de tenant
      // (la tabla tiene RLS y app.tenant_id aún no está seteado en este punto).
      const rows = await this.db.execute<{ tenant_id: string; activa: boolean }>(
        sql`SELECT tenant_id, activa FROM identity.validar_api_key(${hash})`
      );
      const record = rows[0];

      const ctx: RequestContext = record?.activa
        ? { tenantId: record.tenant_id, actor: key.slice(0, 16), role: Role.ADMIN_COMERCIO }
        : { tenantId: "", actor: "", role: "" }; // RolesGuard rechazará con 401

      requestStorage.run(ctx, () => next());
      return;
    }

    // JWT de Supabase (consola de administración, CA-3 de admin-console): el
    // rol viene de app_metadata del token verificado. Un super_admin opera
    // cross-tenant, así que no lleva tenantId; los endpoints admin validan el
    // rol, no el tenant.
    if (auth.startsWith("Bearer ") && pareceJwt(auth.slice("Bearer ".length))) {
      const usuario = await verificarJwtSupabase(auth.slice("Bearer ".length));
      const ctx: RequestContext = usuario
        ? { tenantId: "", actor: usuario.email ?? usuario.sub, role: usuario.role ?? "" }
        : { tenantId: "", actor: "", role: "" }; // token inválido: sin rol
      requestStorage.run(ctx, () => next());
      return;
    }

    // Fallback: headers internos (admin / herramientas internas).
    const ctx: RequestContext = {
      tenantId: (req.header("x-tenant-id") ?? "").trim(),
      actor: (req.header("x-actor") ?? "sistema").trim(),
      role: (req.header("x-role") ?? "").trim()
    };
    requestStorage.run(ctx, () => next());
  }
}
