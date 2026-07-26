import { Injectable, type NestMiddleware } from "@nestjs/common";
import { requestStorage, type RequestContext } from "./request-context";

/** Forma mínima del request que necesitamos (evita depender de los tipos de express). */
interface RequestLike {
  header(name: string): string | undefined;
}

/**
 * Establece el contexto por request en AsyncLocalStorage.
 *
 * Hoy lee cabeceras (`X-Tenant-Id`, `X-Actor`, `X-Role`) como puente; el reemplazo
 * es validar el JWT de Supabase y derivar tenant/rol de sus claims (Fase 0, auth
 * real — follow-up). La presencia y validez las exige RolesGuard en cada endpoint.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: RequestLike, _res: unknown, next: (error?: unknown) => void): void {
    const ctx: RequestContext = {
      tenantId: (req.header("x-tenant-id") ?? "").trim(),
      actor: (req.header("x-actor") ?? "sistema").trim(),
      role: (req.header("x-role") ?? "").trim()
    };
    requestStorage.run(ctx, () => next());
  }
}
