import { Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { naturalezaDeCuenta, saldoNatural } from "@evetev/shared";
import { DB, type Db } from "../../database/drizzle";

/**
 * Command Center y reportes (Fase 10): lecturas sobre lo que las Fases 6–9
 * dejaron en la base. Nada se calcula aquí que no salga de cobros, ledger,
 * consignaciones, lotes o riesgo: cifras reales o ninguna.
 */

export interface Resumen {
  volumenHoyMinor: number;
  cobrosHoy: number;
  volumenMesMinor: number;
  cobrosMes: number;
  /** % de cobros aprobados o conciliados sobre los que terminaron; null si no hubo. */
  aprobacionMesPct: number | null;
  comisionMesMinor: number;
  costoMesMinor: number;
  margenMesMinor: number;
  ivaMesMinor: number;
  porPagarMinor: number;
  retenidoMinor: number;
  enRecaudoMinor: number;
  enTransitoMinor: number;
  pendientesConsignar: number;
  pendientesConsignarMinor: number;
  lotesAbiertos: number;
  colaRiesgo: number;
  comerciosActivos: number;
  comerciosSinTarifa: number;
  comerciosSinKyc: number;
  asientosDescuadrados: number;
}

export interface LineaEstadoCuenta {
  posteadoEn: string;
  asientoId: string;
  kind: string;
  memo: string;
  paymentId: string | null;
  referencia: string | null;
  cuenta: string;
  naturaleza: string;
  direccion: "debit" | "credit";
  montoMinor: number;
}

export interface EstadoCuenta {
  tenantId: string;
  desde: string;
  hasta: string;
  lineas: LineaEstadoCuenta[];
  /** Movimiento neto por cuenta en el periodo, con el signo de su naturaleza. */
  porCuenta: {
    cuenta: string;
    naturaleza: string;
    debitos: number;
    creditos: number;
    netoMinor: number;
  }[];
}

export interface FilaFiscal {
  tenantId: string;
  tenantNombre: string;
  documento: string | null;
  cobros: number;
  baseMinor: number;
  comisionMinor: number;
  ivaMinor: number;
  costoMinor: number;
  margenMinor: number;
}

export interface ResumenComercio {
  tenantId: string;
  ciudad: string | null;
  volumenMesMinor: number;
  cobrosMes: number;
  porPagarMinor: number;
  tieneTarifa: boolean;
  retencionesActivas: number;
  retenidasRiesgo30d: number;
}

type Fila = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);

@Injectable()
export class ReportesAdminService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async resumen(): Promise<Resumen> {
    const f = (await this.db.execute<Fila>(sql`SELECT * FROM evepay.admin_resumen()`))[0] ?? {};
    return {
      volumenHoyMinor: n(f.volumen_hoy_minor),
      cobrosHoy: n(f.cobros_hoy),
      volumenMesMinor: n(f.volumen_mes_minor),
      cobrosMes: n(f.cobros_mes),
      aprobacionMesPct: f.aprobacion_mes_pct == null ? null : Number(f.aprobacion_mes_pct),
      comisionMesMinor: n(f.comision_mes_minor),
      costoMesMinor: n(f.costo_mes_minor),
      margenMesMinor: n(f.margen_mes_minor),
      ivaMesMinor: n(f.iva_mes_minor),
      porPagarMinor: n(f.por_pagar_minor),
      retenidoMinor: n(f.retenido_minor),
      enRecaudoMinor: n(f.en_recaudo_minor),
      enTransitoMinor: n(f.en_transito_minor),
      pendientesConsignar: n(f.pendientes_consignar),
      pendientesConsignarMinor: n(f.pendientes_consignar_minor),
      lotesAbiertos: n(f.lotes_abiertos),
      colaRiesgo: n(f.cola_riesgo),
      comerciosActivos: n(f.comercios_activos),
      comerciosSinTarifa: n(f.comercios_sin_tarifa),
      comerciosSinKyc: n(f.comercios_sin_kyc),
      asientosDescuadrados: n(f.asientos_descuadrados)
    };
  }

  /** Una fila por comercio para el listado: volumen del mes, por pagar, tarifa y riesgo. */
  async comercios(): Promise<ResumenComercio[]> {
    const filas = await this.db.execute<Fila>(sql`SELECT * FROM evepay.admin_comercios_resumen()`);
    return filas.map((f) => ({
      tenantId: String(f.tenant_id),
      ciudad: f.ciudad ? String(f.ciudad) : null,
      volumenMesMinor: n(f.volumen_mes_minor),
      cobrosMes: n(f.cobros_mes),
      porPagarMinor: n(f.por_pagar_minor),
      tieneTarifa: Boolean(f.tiene_tarifa),
      retencionesActivas: n(f.retenciones_activas),
      retenidasRiesgo30d: n(f.retenidas_riesgo_30d)
    }));
  }

  async estadoCuenta(tenantId: string, desde: string, hasta: string): Promise<EstadoCuenta> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.admin_estado_cuenta(${tenantId}::uuid, ${desde}::date, ${hasta}::date)`
    );
    const lineas: LineaEstadoCuenta[] = filas.map((f) => ({
      posteadoEn: new Date(String(f.posted_at)).toISOString(),
      asientoId: String(f.entry_id),
      kind: String(f.kind),
      memo: String(f.memo ?? ""),
      paymentId: f.payment_id ? String(f.payment_id) : null,
      referencia: f.reference ? String(f.reference) : null,
      cuenta: String(f.cuenta),
      naturaleza: naturalezaDeCuenta(String(f.cuenta)),
      direccion: String(f.direction) as "debit" | "credit",
      montoMinor: n(f.amount_minor)
    }));
    const acumulado = new Map<string, { debitos: number; creditos: number }>();
    for (const l of lineas) {
      const a = acumulado.get(l.cuenta) ?? { debitos: 0, creditos: 0 };
      if (l.direccion === "debit") a.debitos += l.montoMinor;
      else a.creditos += l.montoMinor;
      acumulado.set(l.cuenta, a);
    }
    const porCuenta = [...acumulado.entries()]
      .map(([cuenta, a]) => {
        const naturaleza = naturalezaDeCuenta(cuenta);
        return {
          cuenta,
          naturaleza,
          ...a,
          netoMinor: saldoNatural(a.debitos, a.creditos, naturaleza)
        };
      })
      .sort((x, y) => x.cuenta.localeCompare(y.cuenta));
    return { tenantId, desde, hasta, lineas, porCuenta };
  }

  async fiscal(mes: string): Promise<FilaFiscal[]> {
    const filas = await this.db.execute<Fila>(
      sql`SELECT * FROM evepay.admin_reporte_fiscal(${`${mes}-01`}::date)`
    );
    return filas.map((f) => ({
      tenantId: String(f.tenant_id),
      tenantNombre: String(f.tenant_nombre),
      documento: f.documento ? String(f.documento) : null,
      cobros: n(f.cobros),
      baseMinor: n(f.base_minor),
      comisionMinor: n(f.comision_minor),
      ivaMinor: n(f.iva_minor),
      costoMinor: n(f.costo_minor),
      margenMinor: n(f.margen_minor)
    }));
  }
}
