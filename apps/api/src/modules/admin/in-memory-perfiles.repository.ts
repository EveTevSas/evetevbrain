import type { RastroAdmin } from "./comercios.repository";
import type { PerfilGuardado, PerfilesRepository, ResumenPerfil } from "./perfiles.repository";

/** Adaptador en memoria para tests. Guarda lo mismo, incluido el rastro. */
export class InMemoryPerfilesRepository implements PerfilesRepository {
  readonly perfiles = new Map<string, Record<string, unknown>>();
  readonly beneficiarios = new Map<string, Record<string, unknown>[]>();
  readonly rastros: RastroAdmin[] = [];

  async guardar(args: {
    tenantId: string;
    columnas: Record<string, unknown>;
    beneficiarios: Record<string, unknown>[];
    rastro: RastroAdmin;
  }): Promise<void> {
    /* El índice único por documento del esquema real, aquí a mano: es la regla
       que impide dar de alta dos veces el mismo comercio. */
    for (const [otro, p] of this.perfiles) {
      if (
        otro !== args.tenantId &&
        p.tipo_documento === args.columnas.tipo_documento &&
        p.numero_documento === args.columnas.numero_documento
      ) {
        throw Object.assign(new Error("duplicate key"), { code: "23505" });
      }
    }

    this.perfiles.set(args.tenantId, args.columnas);
    // Se reemplazan en bloque, como hace la función de la base.
    this.beneficiarios.set(args.tenantId, args.beneficiarios);
    this.rastros.push(args.rastro);
  }

  async obtener(tenantId: string): Promise<PerfilGuardado | null> {
    const perfil = this.perfiles.get(tenantId);
    if (!perfil) return null;
    return { perfil, beneficiarios: this.beneficiarios.get(tenantId) ?? [] };
  }

  async resumenPorTenant(): Promise<Map<string, ResumenPerfil>> {
    const mapa = new Map<string, ResumenPerfil>();
    for (const [tenantId, p] of this.perfiles) {
      const dv = p.digito_verificacion ? `-${String(p.digito_verificacion)}` : "";
      mapa.set(tenantId, {
        tienePerfil: true,
        documento: `${String(p.tipo_documento)} ${String(p.numero_documento)}${dv}`,
        nombreComercial: (p.nombre_comercial as string | null) ?? null
      });
    }
    return mapa;
  }

  async buscarPorDocumento(tipoDocumento: string, numeroDocumento: string): Promise<string | null> {
    for (const [tenantId, p] of this.perfiles) {
      if (p.tipo_documento === tipoDocumento && p.numero_documento === numeroDocumento) {
        return tenantId;
      }
    }
    return null;
  }
}
