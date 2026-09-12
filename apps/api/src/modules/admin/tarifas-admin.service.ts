import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { TarifaComercio, TarifaProveedor } from "@evetev/shared";
import {
  TARIFAS_REPOSITORY,
  type TarifaVigenteDeComercio,
  type TarifasRepository,
  type VersionTarifaComercio,
  type VersionTarifaProveedor
} from "../tarifas/tarifas.repository";
import { ProvidersService } from "./providers.service";

export interface TarifaComercioAdmin {
  vigente: VersionTarifaComercio | null;
  historial: VersionTarifaComercio[];
}

export interface TarifaProveedorAdmin {
  provider: string;
  vigente: VersionTarifaProveedor | null;
  historial: VersionTarifaProveedor[];
}

/**
 * Tarifas desde la consola (spec `comisiones`, CA-1, CA-8, CA-11).
 *
 * El servicio decide poco a propósito: los rangos y el IVA los valida el
 * esquema en la frontera y otra vez la base; la auditoría la deja la función
 * SQL en la misma transacción. Aquí queda lo que la base no sabe: que un
 * proveedor exista como implementación de PaymentProvider antes de ponerle
 * tarifa, para no guardar una a un nombre mal escrito que nadie usaría.
 */
@Injectable()
export class TarifasAdminService {
  constructor(
    @Inject(TARIFAS_REPOSITORY) private readonly repo: TarifasRepository,
    private readonly providers: ProvidersService
  ) {}

  async tarifaComercio(tenantId: string): Promise<TarifaComercioAdmin> {
    const historial = await this.repo.historialTarifas(tenantId);
    return { vigente: historial[0] ?? null, historial };
  }

  async asignarTarifaComercio(
    tenantId: string,
    tarifa: TarifaComercio,
    actor: string
  ): Promise<VersionTarifaComercio> {
    const id = await this.repo.asignarTarifa({ tenantId, tarifa, actor });
    if (id === null) {
      throw new NotFoundException("Comercio no encontrado.");
    }
    const vigente = await this.repo.tarifaVigente(tenantId);
    if (!vigente || vigente.id !== id) {
      throw new Error("La tarifa recién asignada no quedó como vigente.");
    }
    return vigente;
  }

  async tarifaProveedor(provider: string): Promise<TarifaProveedorAdmin> {
    this.exigirProveedorConocido(provider);
    const historial = await this.repo.historialTarifasProveedor(provider);
    return { provider, vigente: historial[0] ?? null, historial };
  }

  async asignarTarifaProveedor(
    provider: string,
    tarifa: TarifaProveedor,
    actor: string
  ): Promise<VersionTarifaProveedor> {
    this.exigirProveedorConocido(provider);
    const id = await this.repo.asignarTarifaProveedor({ provider, tarifa, actor });
    const vigente = await this.repo.tarifaProveedorVigente(provider);
    if (!vigente || vigente.id !== id) {
      throw new Error("La tarifa recién asignada no quedó como vigente.");
    }
    return vigente;
  }

  /** La vigente de cada comercio que tiene una; sirve para marcar quién no. */
  async tarifasVigentes(): Promise<TarifaVigenteDeComercio[]> {
    return this.repo.tarifasVigentes();
  }

  private exigirProveedorConocido(provider: string): void {
    const conocidos = this.providers.estado().proveedores.map((p) => p.nombre);
    if (!conocidos.includes(provider)) {
      throw new NotFoundException(
        `El proveedor "${provider}" no existe. Los conocidos son: ${conocidos.join(", ")}.`
      );
    }
  }
}
