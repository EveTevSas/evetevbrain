import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { generateApiKey, type ApiKeyEnv } from "../../common/api-key.util";
import type { EstadoMerchant } from "@evetev/shared";
import { MerchantsService } from "../merchants/merchants.service";
import { COMERCIOS_REPOSITORY, type ComerciosRepository } from "./comercios.repository";
import { PerfilComercioService } from "./perfil-comercio.service";
import type { FilaComercio } from "./comercios.repository";
import type { PerfilComercio } from "./perfil-comercio.schema";

export interface CrearComercioInput {
  legalName: string;
  displayName: string;
  perfil: PerfilComercio;
}

export interface ComercioCreado {
  tenantId: string;
  merchantId: string;
  /** API key de producción — mostrar UNA SOLA VEZ. */
  apiKey: string;
  /** API key de sandbox — mostrar UNA SOLA VEZ. */
  testApiKey: string;
  /** Gestión que queda pendiente en el panel del proveedor, o null (CA-8). */
  pasoManualProveedor: string | null;
}

export interface ApiKeyRotada {
  tenantId: string;
  environment: ApiKeyEnv;
  /** La clave nueva — mostrar UNA SOLA VEZ. */
  apiKey: string;
  prefix: string;
  /** Cuántas claves quedaron desactivadas al rotar. */
  desactivadas: number;
}

export interface ApiKeyResumen {
  prefix: string;
  environment: string;
  activa: boolean;
}

export interface ComercioListado {
  tenantId: string;
  legalName: string;
  displayName: string;
  estado: string;
  creadoEn: string;
  merchantId?: string;
  merchantEstado?: string;
  apiKeys: ApiKeyResumen[];
  /** false en los comercios creados antes de que se pidiera el perfil. */
  tienePerfil: boolean;
  /** "NIT 830053105-3", o null si aún no hay perfil. */
  documento: string | null;
  nombreComercial: string | null;
}

/**
 * Onboarding y listado de comercios (uso exclusivo de Evetev).
 * Crea el tenant, registra el merchant en EvePay (y en Akua si está activo),
 * y genera las dos API keys (live + test). Las claves se muestran una sola vez.
 */
@Injectable()
export class AdminService {
  constructor(
    @Inject(COMERCIOS_REPOSITORY) private readonly repo: ComerciosRepository,
    private readonly merchants: MerchantsService,
    private readonly perfiles: PerfilComercioService
  ) {}

  async crearComercio(input: CrearComercioInput, actor: string): Promise<ComercioCreado> {
    /* Antes de crear nada: si el documento ya está, el alta es un duplicado.
       El índice único lo impediría igual, pero saltando a mitad del proceso y
       dejando un tenant sin perfil ni claves. */
    const repetido = await this.perfiles.documentoYaUsado(
      input.perfil.tipoDocumento,
      input.perfil.numeroDocumento
    );
    if (repetido) {
      throw new ConflictException(
        `Ya existe un comercio con el documento ${input.perfil.tipoDocumento} ${input.perfil.numeroDocumento}.`
      );
    }

    const tenantId = await this.repo.crearTenant(input.legalName, input.displayName);

    // El perfil va primero a propósito: su índice único por documento es lo
    // que rechaza un comercio duplicado, y conviene que reviente antes de
    // haber emitido claves que ya podrían estar cobrando.
    await this.perfiles.guardar(tenantId, input.perfil, actor);

    const { merchant, pasoManualProveedor } = await this.merchants.registrar(tenantId, {
      legalName: input.legalName
    });

    const live = generateApiKey("live");
    const test = generateApiKey("test");

    // Las claves y su rastro entran en la MISMA transacción (lo garantiza el
    // repositorio): si la auditoría falla, no queda un comercio operable sin
    // registro de quién lo creó (CA-5).
    await this.repo.emitirClaves({
      tenantId,
      claves: [
        { ...live, environment: "live", label: "Producción" },
        { ...test, environment: "test", label: "Sandbox" }
      ],
      rastro: {
        actor,
        accion: "comercio.crear",
        objetoTipo: "tenant",
        objetoId: tenantId,
        // Prefijos, nunca las claves: el detalle se guarda para siempre.
        detalle: {
          legalName: input.legalName,
          displayName: input.displayName,
          merchantId: merchant.id,
          documento: `${input.perfil.tipoDocumento} ${input.perfil.numeroDocumento}`,
          clavePrefijoLive: live.prefix,
          clavePrefijoTest: test.prefix,
          pasoManualProveedor
        }
      }
    });

    return {
      tenantId,
      merchantId: merchant.id,
      apiKey: live.key,
      testApiKey: test.key,
      pasoManualProveedor
    };
  }

  /**
   * Rota la API key de un entorno: crea la nueva y desactiva las anteriores en
   * una sola transacción (CA-9). Atómico a propósito — si quedaran las dos
   * activas, una clave que se creía revocada seguiría cobrando; y si se
   * desactivara sin crear la nueva, el comercio se queda sin poder cobrar.
   */
  async rotarApiKey(
    tenantId: string,
    environment: ApiKeyEnv,
    actor: string
  ): Promise<ApiKeyRotada> {
    if (!(await this.repo.existeTenant(tenantId))) {
      throw new NotFoundException("Comercio no encontrado.");
    }

    const nueva = generateApiKey(environment);

    const revocados = await this.repo.rotarClave({
      tenantId,
      environment,
      nueva: {
        ...nueva,
        environment,
        label: environment === "live" ? "Producción" : "Sandbox"
      },
      rastro: {
        actor,
        accion: "api_key.rotar",
        objetoTipo: "tenant",
        objetoId: tenantId,
        detalle: { environment, prefijoNuevo: nueva.prefix }
      }
    });

    return {
      tenantId,
      environment,
      apiKey: nueva.key,
      prefix: nueva.prefix,
      desactivadas: revocados.length
    };
  }

  /**
   * Aprueba o rechaza el KYC de un comercio a mano (CA-22).
   *
   * Con Akua el estado lo movía su webhook. Con un proveedor agregador no
   * llega ningún evento —el alta en su panel es manual y EvePay no se entera—,
   * así que sin esto un comercio se quedaba en `en_revision` para siempre y,
   * desde que cobrar exige estar aprobado, no podría cobrar nunca.
   *
   * Se permite mover el estado en cualquier dirección, incluso deshacer un
   * rechazo. La alternativa —que rechazar fuera definitivo— convertiría un
   * clic equivocado en tener que recrear el comercio, perdiendo su historial
   * y sus claves. Queda auditado, que es la garantía que importa aquí.
   */
  async cambiarEstadoKyc(
    tenantId: string,
    estado: EstadoMerchant,
    actor: string
  ): Promise<{ tenantId: string; merchantId: string; estado: EstadoMerchant }> {
    const merchant = await this.merchants.obtenerPorTenant(tenantId);
    if (!merchant) {
      throw new NotFoundException("Este comercio no tiene un merchant registrado.");
    }

    await this.repo.cambiarEstadoMerchant({
      tenantId,
      merchantId: merchant.id,
      estado,
      rastro: {
        actor,
        accion: estado === "aprobado" ? "comercio.kyc.aprobar" : "comercio.kyc.rechazar",
        objetoTipo: "merchant",
        objetoId: merchant.id,
        detalle: { tenantId, estadoAnterior: merchant.estado, estado }
      }
    });

    return { tenantId, merchantId: merchant.id, estado };
  }

  /**
   * Activa o desactiva un comercio (CA-10). Desactivar NO borra nada: su
   * historial y su ledger siguen consultables, porque son la contabilidad de
   * dinero que ya se movió.
   */
  async cambiarEstadoComercio(
    tenantId: string,
    activo: boolean,
    actor: string
  ): Promise<{ tenantId: string; estado: string }> {
    const estado = activo ? "activo" : "inactivo";

    const estadoFinal = await this.repo.cambiarEstadoTenant({
      tenantId,
      estado,
      rastro: {
        actor,
        accion: activo ? "comercio.activar" : "comercio.desactivar",
        objetoTipo: "tenant",
        objetoId: tenantId,
        detalle: { estado }
      }
    });

    if (estadoFinal === null) {
      throw new NotFoundException("Comercio no encontrado.");
    }

    return { tenantId, estado: estadoFinal };
  }

  /** Lista todos los comercios (cross-tenant via SECURITY DEFINER). */
  async listarComercios(): Promise<ComercioListado[]> {
    return this.armar(await this.repo.listarComercios());
  }

  /** Ficha de un comercio, o null si no existe. */
  async obtenerComercio(tenantId: string): Promise<ComercioListado | null> {
    const [comercio] = await this.armar(await this.repo.obtenerComercio(tenantId));
    return comercio ?? null;
  }

  /**
   * Las funciones devuelven una fila por API key, así que un comercio con dos
   * claves llega dos veces. Se agrupan por tenant y se les añade el perfil.
   */
  private async armar(rows: FilaComercio[]): Promise<ComercioListado[]> {
    const map = new Map<string, ComercioListado>();
    for (const row of rows) {
      if (!map.has(row.tenant_id)) {
        map.set(row.tenant_id, {
          tenantId: row.tenant_id,
          legalName: row.legal_name,
          displayName: row.display_name,
          estado: row.tenant_status,
          creadoEn: row.creado_en,
          merchantId: row.merchant_id ?? undefined,
          merchantEstado: row.merchant_status ?? undefined,
          apiKeys: [],
          tienePerfil: false,
          documento: null,
          nombreComercial: null
        });
      }
      if (row.key_prefix) {
        map.get(row.tenant_id)!.apiKeys.push({
          prefix: row.key_prefix,
          environment: row.key_environment ?? "live",
          activa: row.key_activa ?? false
        });
      }
    }
    const perfiles = await this.perfiles.resumenPorTenant();
    for (const comercio of map.values()) {
      const p = perfiles.get(comercio.tenantId);
      comercio.tienePerfil = p?.tienePerfil ?? false;
      comercio.documento = p?.documento ?? null;
      comercio.nombreComercial = p?.nombreComercial ?? null;
    }

    return Array.from(map.values());
  }
}
