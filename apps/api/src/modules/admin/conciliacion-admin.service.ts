import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import type { PaymentProvider, RangoFechas } from "@evetev/shared";
import { DB, type Db } from "../../database/drizzle";
import { PAYMENT_PROVIDER } from "../pagos/payment-provider.token";
import { ReconciliacionService } from "../conciliacion/reconciliacion.service";
import { AdminAuditService } from "./admin-audit.service";

/**
 * Conciliación y ledger para la consola (CA-19 a CA-21 de admin-console).
 */

export type ModoConciliacion = "automatica" | "no_soportada";

export interface CorridaConciliacion {
  id: string;
  tenantId: string;
  tenantNombre: string;
  desde: string;
  hasta: string;
  modo: ModoConciliacion;
  provider: string;
  conciliados: number | null;
  diferencias: number | null;
  huerfanosProveedor: number | null;
  noConciliados: number | null;
  nota: string | null;
  actor: string;
  corridoEn: string;
}

export interface SaldoCuenta {
  cuenta: string;
  debitos: number;
  creditos: number;
  saldoMinor: number;
  movimientos: number;
}

export interface AsientoLedger {
  id: string;
  paymentId: string | null;
  kind: string;
  memo: string;
  posteadoEn: string;
  lineas: { cuenta: string; direccion: string; montoMinor: number }[];
  /** false si ese asiento por sí solo no tiene débitos = créditos. */
  cuadra: boolean;
}

export interface LedgerTenant {
  saldos: SaldoCuenta[];
  asientos: AsientoLedger[];
  totalDebitos: number;
  totalCreditos: number;
  /** true si la partida doble cuadra en todo el ledger del comercio. */
  cuadra: boolean;
  /** Asientos concretos que no cuadran; vacío es lo normal. */
  asientosDescuadrados: string[];
}

@Injectable()
export class ConciliacionAdminService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly conciliacion: ReconciliacionService,
    private readonly auditoria: AdminAuditService
  ) {}

  /**
   * Corre la conciliación de un comercio y guarda el resultado (CA-19).
   *
   * Si el proveedor no expone liquidaciones (CA-20) NO se intenta: se registra
   * la corrida como `no_soportada` con su explicación. Devolver un reporte de
   * ceros sería peor que no tener nada, porque se lee como "todo cuadra"
   * cuando en realidad nadie comprobó nada.
   */
  async correr(tenantId: string, rango: RangoFechas, actor: string): Promise<CorridaConciliacion> {
    const provider = this.provider.nombre;

    if (!this.provider.capacidades.liquidaciones) {
      const nota = `${provider} no expone liquidaciones por API: la conciliación de este periodo debe hacerse contra el reporte de transacciones de su panel.`;
      const id = await this.registrar({
        tenantId,
        rango,
        modo: "no_soportada",
        provider,
        nota,
        actor
      });
      await this.auditar(actor, tenantId, rango, "no_soportada", provider);
      return this.buscar(id);
    }

    const { rango: _rango, ...cifras } = await this.conciliacion.conciliar(tenantId, rango);
    const id = await this.registrar({
      tenantId,
      rango,
      modo: "automatica",
      provider,
      actor,
      cifras
    });
    await this.auditar(actor, tenantId, rango, "automatica", provider, cifras);
    return this.buscar(id);
  }

  /** Histórico de corridas, del más reciente al más antiguo (CA-19). */
  async historico(tenantId?: string, limite = 50): Promise<CorridaConciliacion[]> {
    const filas = await this.db.execute<Record<string, unknown>>(sql`
      SELECT * FROM evepay.admin_listar_conciliaciones(${tenantId ?? null}::uuid, ${limite})
    `);
    return filas.map((f) => aCorrida(f));
  }

  /** Ledger del comercio con el saldo reconstruido desde los asientos (CA-21). */
  async ledger(tenantId: string, limiteAsientos = 50): Promise<LedgerTenant> {
    const [saldosRaw, asientosRaw] = await Promise.all([
      this.db.execute<Record<string, unknown>>(
        sql`SELECT * FROM evepay.admin_ledger_resumen(${tenantId}::uuid)`
      ),
      this.db.execute<Record<string, unknown>>(
        sql`SELECT * FROM evepay.admin_ledger_asientos(${tenantId}::uuid, ${limiteAsientos})`
      )
    ]);

    const saldos: SaldoCuenta[] = saldosRaw.map((f) => ({
      cuenta: String(f.cuenta),
      debitos: Number(f.debitos),
      creditos: Number(f.creditos),
      saldoMinor: Number(f.saldo_minor),
      movimientos: Number(f.movimientos)
    }));

    const asientos: AsientoLedger[] = asientosRaw.map((f) => ({
      id: String(f.id),
      paymentId: f.payment_id ? String(f.payment_id) : null,
      kind: String(f.kind),
      memo: String(f.memo ?? ""),
      posteadoEn: String(f.posted_at),
      lineas: Array.isArray(f.lineas)
        ? (f.lineas as { cuenta: string; direccion: string; montoMinor: number }[])
        : [],
      cuadra: Boolean(f.cuadra)
    }));

    const totalDebitos = saldos.reduce((a, s) => a + s.debitos, 0);
    const totalCreditos = saldos.reduce((a, s) => a + s.creditos, 0);

    return {
      saldos,
      asientos,
      totalDebitos,
      totalCreditos,
      cuadra: totalDebitos === totalCreditos,
      asientosDescuadrados: asientos.filter((a) => !a.cuadra).map((a) => a.id)
    };
  }

  private async registrar(args: {
    tenantId: string;
    rango: RangoFechas;
    modo: ModoConciliacion;
    provider: string;
    actor: string;
    nota?: string;
    cifras?: {
      conciliados: number;
      diferencias: number;
      huerfanosProveedor: number;
      noConciliados: number;
    };
  }): Promise<string> {
    const filas = await this.db.execute<{ admin_registrar_conciliacion: string }>(sql`
      SELECT evepay.admin_registrar_conciliacion(
        ${args.tenantId}::uuid,
        ${args.rango.desde}::timestamptz,
        ${args.rango.hasta}::timestamptz,
        ${args.modo},
        ${args.provider},
        ${args.cifras?.conciliados ?? null},
        ${args.cifras?.diferencias ?? null},
        ${args.cifras?.huerfanosProveedor ?? null},
        ${args.cifras?.noConciliados ?? null},
        ${args.nota ?? null},
        ${args.actor}
      )
    `);
    const id = filas[0]?.admin_registrar_conciliacion;
    if (!id) {
      throw new Error("No se pudo guardar la corrida de conciliación.");
    }
    return id;
  }

  private async buscar(id: string): Promise<CorridaConciliacion> {
    const todas = await this.historico(undefined, 200);
    const encontrada = todas.find((c) => c.id === id);
    if (!encontrada) {
      throw new Error("La corrida se registró pero no se pudo releer.");
    }
    return encontrada;
  }

  private async auditar(
    actor: string,
    tenantId: string,
    rango: RangoFechas,
    modo: ModoConciliacion,
    provider: string,
    cifras?: Record<string, number>
  ): Promise<void> {
    await this.auditoria.registrar({
      actor,
      accion: "conciliacion.correr",
      objetoTipo: "tenant",
      objetoId: tenantId,
      detalle: { modo, provider, desde: rango.desde, hasta: rango.hasta, ...cifras }
    });
  }
}

function aCorrida(f: Record<string, unknown>): CorridaConciliacion {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    id: String(f.id),
    tenantId: String(f.tenant_id),
    tenantNombre: String(f.tenant_nombre),
    desde: String(f.desde),
    hasta: String(f.hasta),
    modo: f.modo as ModoConciliacion,
    provider: String(f.provider),
    conciliados: num(f.conciliados),
    diferencias: num(f.diferencias),
    huerfanosProveedor: num(f.huerfanos_proveedor),
    noConciliados: num(f.no_conciliados),
    nota: f.nota ? String(f.nota) : null,
    actor: String(f.actor),
    corridoEn: String(f.corrido_en)
  };
}
