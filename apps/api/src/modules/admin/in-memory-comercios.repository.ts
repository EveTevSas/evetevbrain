import { randomUUID } from "node:crypto";
import type {
  ClaveParaGuardar,
  ComerciosRepository,
  FilaComercio,
  RastroAdmin
} from "./comercios.repository";

/**
 * Adaptador en memoria para tests. Guarda lo mismo que el de Postgres —
 * incluido el rastro— para que los tests puedan afirmar sobre QUÉ pasó en vez
 * de sobre cuántas veces se llamó a `db.execute` y en qué orden.
 *
 * No simula RLS ni las funciones SECURITY DEFINER: eso vive en la base y se
 * comprueba contra ella. Aquí se prueba la decisión del servicio.
 */
export class InMemoryComerciosRepository implements ComerciosRepository {
  readonly tenants = new Map<string, { legalName: string; displayName: string; estado: string }>();
  readonly merchants = new Map<string, { tenantId: string; estado: string }>();
  readonly claves: (ClaveParaGuardar & { tenantId: string; activa: boolean })[] = [];
  readonly rastros: RastroAdmin[] = [];

  async crearTenant(legalName: string, displayName: string): Promise<string> {
    const id = randomUUID();
    this.tenants.set(id, { legalName, displayName, estado: "activo" });
    return id;
  }

  async existeTenant(tenantId: string): Promise<boolean> {
    return this.tenants.has(tenantId);
  }

  async emitirClaves(args: {
    tenantId: string;
    claves: ClaveParaGuardar[];
    rastro: RastroAdmin;
  }): Promise<void> {
    for (const c of args.claves) {
      this.claves.push({ ...c, tenantId: args.tenantId, activa: true });
    }
    this.rastros.push(args.rastro);
  }

  async rotarClave(args: {
    tenantId: string;
    environment: ClaveParaGuardar["environment"];
    nueva: ClaveParaGuardar;
    rastro: RastroAdmin;
  }): Promise<string[]> {
    const revocadas: string[] = [];
    for (const c of this.claves) {
      if (c.tenantId === args.tenantId && c.environment === args.environment && c.activa) {
        c.activa = false;
        revocadas.push(c.prefix);
      }
    }
    this.claves.push({ ...args.nueva, tenantId: args.tenantId, activa: true });
    // Igual que el adaptador real: el rastro se completa con lo revocado.
    this.rastros.push({
      ...args.rastro,
      detalle: { ...args.rastro.detalle, prefijosRevocados: revocadas }
    });
    return revocadas;
  }

  async cambiarEstadoMerchant(args: {
    tenantId: string;
    merchantId: string;
    estado: string;
    rastro: RastroAdmin;
  }): Promise<void> {
    const m = this.merchants.get(args.merchantId);
    if (m && m.tenantId === args.tenantId) {
      m.estado = args.estado;
    }
    this.rastros.push(args.rastro);
  }

  async cambiarEstadoTenant(args: {
    tenantId: string;
    estado: string;
    rastro: RastroAdmin;
  }): Promise<string | null> {
    const t = this.tenants.get(args.tenantId);
    if (!t) return null;
    t.estado = args.estado;
    this.rastros.push(args.rastro);
    return args.estado;
  }

  async listarComercios(): Promise<FilaComercio[]> {
    const filas: FilaComercio[] = [];
    for (const [tenantId, t] of this.tenants) {
      filas.push(...this.filasDe(tenantId, t));
    }
    return filas;
  }

  async obtenerComercio(tenantId: string): Promise<FilaComercio[]> {
    const t = this.tenants.get(tenantId);
    return t ? this.filasDe(tenantId, t) : [];
  }

  /** Una fila por clave, como hacen las funciones de la base. */
  private filasDe(
    tenantId: string,
    t: { legalName: string; displayName: string; estado: string }
  ): FilaComercio[] {
    const merchant = [...this.merchants.entries()].find(([, m]) => m.tenantId === tenantId);
    const claves = this.claves.filter((c) => c.tenantId === tenantId);
    const base = {
      tenant_id: tenantId,
      legal_name: t.legalName,
      display_name: t.displayName,
      tenant_status: t.estado,
      creado_en: "2026-09-03T00:00:00.000Z",
      merchant_id: merchant?.[0] ?? null,
      merchant_status: merchant?.[1].estado ?? null
    };

    if (claves.length === 0) {
      return [{ ...base, key_prefix: null, key_environment: null, key_activa: null }];
    }
    return claves.map((c) => ({
      ...base,
      key_prefix: c.prefix,
      key_environment: c.environment,
      key_activa: c.activa
    }));
  }
}
