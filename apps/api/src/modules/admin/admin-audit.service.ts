import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Db } from "../../database/drizzle";

/** La base o una transacción suya: ambas saben ejecutar SQL. */
type Ejecutor = Pick<Db, "execute">;

/** Una acción de escritura de la consola, tal como queda registrada. */
export interface AccionAdmin {
  id: string;
  actor: string;
  accion: string;
  objetoTipo: string | null;
  objetoId: string | null;
  detalle: Record<string, unknown>;
  creadoEn: string;
}

export interface RegistrarAccionInput {
  actor: string;
  accion: string;
  objetoTipo?: string;
  objetoId?: string;
  /** Detalle no sensible: prefijos de clave, nombres, conteos. Nunca secretos. */
  detalle?: Record<string, unknown>;
}

/**
 * Rastro de las acciones administrativas (CA-4, CA-5 de admin-console).
 *
 * La regla que sostiene todo esto: **una acción admin sin rastro no ocurre**.
 * Por eso `registrar` no atrapa sus errores — deja que suban para que la
 * operación que la invocó falle. Es deliberado que una caída de la auditoría
 * bloquee el alta de un comercio: en una plataforma de pagos, no poder decir
 * quién hizo un cambio es peor que no haberlo hecho.
 *
 * La escritura y la lectura pasan por funciones SECURITY DEFINER; la tabla
 * tiene RLS sin políticas, así que no hay otro camino (ver migración 0009).
 */
@Injectable()
export class AdminAuditService {
  constructor(@Inject(DB) private readonly db: Db | null) {}

  /**
   * Registra la acción y devuelve su id. Lanza si no se pudo escribir.
   *
   * Cuando corre sin base (entornos in-memory de prueba) no hay dónde dejar el
   * rastro, y tampoco hay nada que auditar: no se persiste nada.
   */
  async registrar(input: RegistrarAccionInput): Promise<string | null> {
    if (!this.db) return null;
    return this.registrarEn(this.db, input);
  }

  /**
   * Registra la acción DENTRO de una transacción en curso. Es la forma que
   * cumple CA-5 de verdad: si el rastro no se puede escribir, la transacción
   * entera se deshace y la acción no llega a existir. La versión suelta de
   * arriba deja el hueco de una acción ya aplicada cuyo registro falla después.
   */
  async registrarEn(ejecutor: Ejecutor, input: RegistrarAccionInput): Promise<string> {
    const filas = await ejecutor.execute<{ registrar_accion_admin: string }>(sql`
      SELECT audit.registrar_accion_admin(
        ${input.actor},
        ${input.accion},
        ${input.objetoTipo ?? null},
        ${input.objetoId ?? null},
        ${JSON.stringify(input.detalle ?? {})}::jsonb
      )
    `);

    const id = filas[0]?.registrar_accion_admin;
    if (!id) {
      throw new Error("La auditoría no devolvió un registro; se aborta la acción.");
    }
    return id;
  }

  /** Últimas acciones registradas, de la más reciente a la más antigua. */
  async listar(limite = 100): Promise<AccionAdmin[]> {
    if (!this.db) return [];

    const filas = await this.db.execute<{
      id: string;
      actor: string;
      accion: string;
      objeto_tipo: string | null;
      objeto_id: string | null;
      detalle: Record<string, unknown>;
      creado_en: string;
    }>(sql`SELECT * FROM audit.admin_listar_acciones(${limite})`);

    return filas.map((f) => ({
      id: f.id,
      actor: f.actor,
      accion: f.accion,
      objetoTipo: f.objeto_tipo,
      objetoId: f.objeto_id,
      detalle: f.detalle ?? {},
      creadoEn: f.creado_en
    }));
  }
}
