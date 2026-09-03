import { ConflictException, Inject, Injectable } from "@nestjs/common";
import {
  PERFILES_REPOSITORY,
  type PerfilGuardado,
  type PerfilesRepository
} from "./perfiles.repository";
import type { PerfilComercio } from "./perfil-comercio.schema";

export type { PerfilGuardado };

/**
 * Perfil del comercio: identificación, domicilio, representante legal, persona
 * de contacto, beneficiarios finales y cuenta de dispersión.
 *
 * Todo pasa por las funciones SECURITY DEFINER de la migración 0012: las
 * tablas tienen RLS sin políticas, así que no hay otro camino. Es dato
 * cross-tenant de operación, no del comercio.
 */

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
  constructor(@Inject(PERFILES_REPOSITORY) private readonly repo: PerfilesRepository) {}

  /**
   * Guarda el perfil y sus beneficiarios. `verificado_por` y `verificado_en`
   * los pone el sistema con quien está operando: son el registro de quién dijo
   * haber visto los documentos, y eso no lo puede escribir el formulario.
   */
  async guardar(tenantId: string, perfil: PerfilComercio, actor: string): Promise<void> {
    const algunoVerificado =
      perfil.rutVerificado ||
      perfil.camaraComercioVerificada ||
      perfil.cedulaRepVerificada ||
      perfil.certificacionBancariaVerificada;

    const columnas = {
      ...aColumnas(perfil),
      // Quién dijo haber visto los documentos y cuándo lo pone el sistema con
      // quien está operando: eso no lo puede escribir el formulario.
      verificado_en: algunoVerificado ? new Date().toISOString() : null,
      verificado_por: algunoVerificado ? actor : null
    };

    try {
      await this.repo.guardar({
        tenantId,
        columnas,
        beneficiarios: beneficiariosAColumnas(perfil),
        rastro: {
          actor,
          accion: "comercio.perfil.guardar",
          objetoTipo: "tenant",
          objetoId: tenantId,
          // El detalle NO repite el perfil entero: sería duplicar datos
          // personales en una tabla que nunca se puede borrar.
          detalle: {
            documento: `${perfil.tipoDocumento} ${perfil.numeroDocumento}`,
            tipoPersona: perfil.tipoPersona,
            beneficiarios: perfil.beneficiarios.length,
            conCuentaDispersion: Boolean(perfil.numeroCuenta)
          }
        }
      });
    } catch (error) {
      this.comoConflicto(error, perfil);
    }
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
    const encontrado = await this.repo.buscarPorDocumento(tipoDocumento, numeroDocumento.trim());
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
    return this.repo.obtener(tenantId);
  }

  /** Qué comercios tienen perfil y cuáles no, para marcarlo en el listado. */
  async resumenPorTenant() {
    return this.repo.resumenPorTenant();
  }
}
