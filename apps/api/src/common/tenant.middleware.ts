import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { requestStorage, type RequestContext } from "./request-context";
import { hashApiKey } from "./api-key.util";
import { DB, type Db } from "../database/drizzle";
import { merchantApiKeys } from "../database/schema";
import { Role } from "../modules/identidad/roles";

interface RequestLike {
  header(name: string): string | undefined;
}

/**
 * Establece el contexto por request (tenant/actor/rol) en AsyncLocalStorage.
 *
 * Flujo principal: `Authorization: Bearer evpk_*` → hash → lookup en DB → tenant real.
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

      const [record] = await this.db
        .select({ tenantId: merchantApiKeys.tenantId, activa: merchantApiKeys.activa })
        .from(merchantApiKeys)
        .where(eq(merchantApiKeys.keyHash, hash))
        .limit(1);

      const ctx: RequestContext = record?.activa
        ? { tenantId: record.tenantId, actor: key.slice(0, 16), role: Role.ADMIN_COMERCIO }
        : { tenantId: "", actor: "", role: "" }; // RolesGuard rechazará con 401

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
