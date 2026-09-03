import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DB, type Db } from "../../database/drizzle";
import { AdminAuditService } from "./admin-audit.service";
import type { PerfilComercio } from "./perfil-comercio.schema";

/**
 * Perfil del comercio: identificación, domicilio, representante legal, persona
 * de contacto, beneficiarios finales y cuenta de dispersión.
 *
 * Todo pasa por las funciones SECURITY DEFINER de la migración 0012: las
 * tablas tienen RLS sin políticas, así que no hay otro camino. Es dato
 * cross-tenant de operación, no del comercio.
 */

export interface PerfilGuardado {
  perfil: Record<string, unknown>;
  beneficiarios: Record<string, unknown>[];
}

/** Las columnas van en snake_case; el resto de la aplicación, en camelCase. */
function aColumnas(p: PerfilComercio): Record<string, unknown> {
  const vacioANull = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

  return {
    tipo_persona: p.tipoPersona,
    nombre_comercial: vacioANull(p.nombreComercial),
    tipo_documento: p.tipoDocumento,
    numero_documento: p.numeroDocumento.trim(),
    digito_verificacion: vacioANull(p.digitoVerificacion),
    ciiu: vacioANull(p.ciiu),
    responsable_iva: p.responsableIva,
    direccion: p.direccion,
    ciudad: p.ciudad,
    departamento: p.departamento,
    telefono: vacioANull(p.telefono),
    sitio_web: vacioANull(p.sitioWeb),
    correo_notificaciones: p.correoNotificaciones,
    correo_facturacion: p.correoFacturacion,
    direccion_facturacion: vacioANull(p.direccionFacturacion),
    rep_nombre: p.repNombre,
    rep_tipo_documento: p.repTipoDocumento,
    rep_numero_documento: p.repNumeroDocumento.trim(),
    rep_correo: vacioANull(p.repCorreo),
    rep_telefono: vacioANull(p.repTelefono),
    rep_es_pep: p.repEsPep,
    contacto_nombre: p.contactoNombre,
    contacto_cargo: vacioANull(p.contactoCargo),
    contacto_correo: p.contactoCorreo,
    contacto_telefono: vacioANull(p.contactoTelefono),
    banco: vacioANull(p.banco),
    tipo_cuenta: p.tipoCuenta ?? null,
    numero_cuenta: vacioANull(p.numeroCuenta),
    titular_cuenta: vacioANull(p.titularCuenta),
    titular_documento: vacioANull(p.titularDocumento),
    rut_verificado: p.rutVerificado,
    camara_comercio_verificada: p.camaraComercioVerificada,
    cedula_rep_verificada: p.cedulaRepVerificada,
    certificacion_bancaria_verificada: p.certificacionBancariaVerificada
  };
}

function beneficiariosAColumnas(p: PerfilComercio): Record<string, unknown>[] {
  return p.beneficiarios.map((b) => ({
    nombre: b.nombre,
    tipo_documento: b.tipoDocumento,
    numero_documento: b.numeroDocumento.trim(),
    participacion: b.participacion ?? null,
    es_pep: b.esPep
  }));
}

@Injectable()
export class PerfilComercioService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AdminAuditService
  ) {}

  /**
   * Guarda el perfil y sus beneficiarios. `verificado_por` y `verificado_en`
   * los pone el sistema con quien está operando: son el registro de quién dijo
   * haber visto los documentos, y eso no lo puede escribir el formulario.
   */
  async guardar(tenantId: string, perfil: PerfilComercio, actor: string): Promise<void> {
    const columnas = aColumnas(perfil);
    const algunoVerificado =
      perfil.rutVerificado ||
      perfil.camaraComercioVerificada ||
      perfil.cedulaRepVerificada ||
      perfil.certificacionBancariaVerificada;

    const conDiligencia = {
      ...columnas,
      verificado_en: algunoVerificado ? new Date().toISOString() : null,
      verificado_por: algunoVerificado ? actor : null
    };

    try {
      await this.guardarEn(tenantId, conDiligencia, perfil, actor);
    } catch (error) {
      this.comoConflicto(error, perfil);
    }
  }

  private async guardarEn(
    tenantId: string,
    conDiligencia: Record<string, unknown>,
    perfil: PerfilComercio,
    actor: string
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        SELECT identity.admin_guardar_perfil_comercio(
          ${tenantId}::uuid,
          ${JSON.stringify(conDiligencia)}::jsonb,
          ${JSON.stringify(beneficiariosAColumnas(perfil))}::jsonb
        )
      `);

      await this.auditoria.registrarEn(tx, {
        actor,
        accion: "comercio.perfil.guardar",
        objetoTipo: "tenant",
        objetoId: tenantId,
        // El detalle no repite el perfil entero: sería duplicar datos
        // personales en una tabla que nunca se puede borrar.
        detalle: {
          documento: `${perfil.tipoDocumento} ${perfil.numeroDocumento}`,
          tipoPersona: perfil.tipoPersona,
          beneficiarios: perfil.beneficiarios.length,
          conCuentaDispersion: Boolean(perfil.numeroCuenta)
        }
      });
    });
  }

  /**
   * ¿Ya hay un comercio con ese documento? Se pregunta ANTES de crear nada:
   * el índice único es la garantía, pero salta cuando el tenant ya existe y
   * deja basura. Preguntar primero da además un mensaje que se entiende, en
   * vez de un error de restricción de base de datos.
   */
  async documentoYaUsado(
    tipoDocumento: string,
    numeroDocumento: string,
    exceptoTenant?: string
  ): Promise<string | null> {
    const filas = await this.db.execute<{ tenant_id: string }>(sql`
      SELECT tenant_id FROM identity.admin_buscar_por_documento(
        ${tipoDocumento}, ${numeroDocumento.trim()}
      )
    `);
    const encontrado = filas[0]?.tenant_id ?? null;
    return encontrado && encontrado !== exceptoTenant ? encontrado : null;
  }

  /** Traduce la violación del índice único a algo que se pueda leer. */
  private comoConflicto(error: unknown, perfil: PerfilComercio): never {
    const codigo = (error as { code?: string })?.code;
    if (codigo === "23505") {
      throw new ConflictException(
        `Ya existe un comercio con el documento ${perfil.tipoDocumento} ${perfil.numeroDocumento}.`
      );
    }
    throw error;
  }

  /** Perfil completo del comercio, o null si todavía no se ha capturado. */
  async obtener(tenantId: string): Promise<PerfilGuardado | null> {
    const filas = await this.db.execute<{
      perfil: Record<string, unknown>;
      beneficiarios: Record<string, unknown>[];
    }>(sql`SELECT * FROM identity.admin_perfil_comercio(${tenantId}::uuid)`);

    const fila = filas[0];
    if (!fila) return null;
    return { perfil: fila.perfil, beneficiarios: fila.beneficiarios ?? [] };
  }

  /** Qué comercios tienen perfil y cuáles no, para marcarlo en el listado. */
  async resumenPorTenant(): Promise<
    Map<string, { tienePerfil: boolean; documento: string | null; nombreComercial: string | null }>
  > {
    const filas = await this.db.execute<{
      tenant_id: string;
      tiene_perfil: boolean;
      documento: string | null;
      nombre_comercial: string | null;
    }>(sql`SELECT * FROM identity.admin_comercios_con_perfil()`);

    return new Map(
      filas.map((f) => [
        f.tenant_id,
        {
          tienePerfil: f.tiene_perfil,
          documento: f.documento,
          nombreComercial: f.nombre_comercial
        }
      ])
    );
  }
}
