import { Module } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";

/**
 * Identidad: auth, RBAC y tenants (= comercios). Arranque mínimo: expone el
 * RolesGuard. El JWT real de Supabase se integra en el TenantMiddleware (follow-up).
 */
@Module({
  providers: [RolesGuard],
  exports: [RolesGuard]
})
export class IdentidadModule {}
