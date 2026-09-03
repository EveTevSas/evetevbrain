import { z } from "zod";
import { nitCoincideConDv } from "../../common/nit.util";

/**
 * Datos que se le piden a un comercio para darlo de alta.
 *
 * La validación vive en la frontera (§3) y es deliberadamente estricta en lo
 * que después no se puede arreglar solo: el documento con el que se factura y
 * se dispersa, y quién está detrás de la empresa. Lo demás admite completarse
 * más tarde.
 */

const documento = z
  .string()
  .trim()
  .min(5)
  .max(20)
  .regex(/^[\d.\s-]+$/, "El documento solo puede llevar dígitos, puntos o guiones");

const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const BeneficiarioFinalSchema = z.object({
  nombre: texto(3, 200),
  tipoDocumento: z.enum(["CC", "CE", "PA", "NIT"]),
  numeroDocumento: documento,
  /** Porcentaje de participación; se declara desde el 5%. */
  participacion: z.number().min(0).max(100).optional(),
  esPep: z.boolean().default(false)
});

export const PerfilComercioSchema = z
  .object({
    // Identificación
    tipoPersona: z.enum(["natural", "juridica"]),
    nombreComercial: opcional(150),
    tipoDocumento: z.enum(["NIT", "CC", "CE", "PA"]),
    numeroDocumento: documento,
    digitoVerificacion: z
      .string()
      .trim()
      .regex(/^\d?$/, "El dígito de verificación es un solo número")
      .optional()
      .or(z.literal("")),
    /** Código CIIU de la actividad económica (sale del RUT). */
    ciiu: opcional(10),
    responsableIva: z.boolean().default(false),

    // Domicilio
    direccion: texto(5, 200),
    ciudad: texto(2, 100),
    departamento: texto(2, 100),
    telefono: opcional(30),
    sitioWeb: opcional(200),

    // Correos: operativo y administrativo no son el mismo
    correoNotificaciones: z.string().trim().email().max(150),
    correoFacturacion: z.string().trim().email().max(150),
    direccionFacturacion: opcional(200),

    // Representante legal
    repNombre: texto(3, 200),
    repTipoDocumento: z.enum(["CC", "CE", "PA"]),
    repNumeroDocumento: documento,
    repCorreo: z.string().trim().email().max(150).optional().or(z.literal("")),
    repTelefono: opcional(30),
    repEsPep: z.boolean().default(false),

    // Persona de contacto
    contactoNombre: texto(3, 200),
    contactoCargo: opcional(100),
    contactoCorreo: z.string().trim().email().max(150),
    contactoTelefono: opcional(30),

    // Dispersión
    banco: opcional(100),
    tipoCuenta: z.enum(["ahorros", "corriente"]).optional(),
    numeroCuenta: opcional(40),
    titularCuenta: opcional(200),
    titularDocumento: z.string().trim().max(20).optional().or(z.literal("")),

    // Diligencia documental
    rutVerificado: z.boolean().default(false),
    camaraComercioVerificada: z.boolean().default(false),
    cedulaRepVerificada: z.boolean().default(false),
    certificacionBancariaVerificada: z.boolean().default(false),

    beneficiarios: z.array(BeneficiarioFinalSchema).max(20).default([])
  })
  .superRefine((p, ctx) => {
    // El dígito de verificación debe cuadrar con el número (algoritmo DIAN).
    if (p.tipoDocumento === "NIT" && !nitCoincideConDv(p.numeroDocumento, p.digitoVerificacion)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["digitoVerificacion"],
        message: "El dígito de verificación no corresponde al NIT."
      });
    }

    /* Una empresa siempre tiene a alguien detrás. Si no se declara ninguno, o
       no se preguntó o se está ocultando; en los dos casos el expediente está
       incompleto y es justo lo que el conocimiento del cliente persigue. Una
       persona natural es su propio beneficiario, así que ahí no aplica. */
    if (p.tipoPersona === "juridica" && p.beneficiarios.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["beneficiarios"],
        message:
          "Una persona jurídica debe declarar al menos un beneficiario final (5% o más del capital, o control efectivo)."
      });
    }

    /* Los datos de dispersión van juntos o no van: media cuenta bancaria no
       sirve para transferir y da la falsa impresión de que ya se puede. */
    const cuenta = [p.banco, p.tipoCuenta, p.numeroCuenta].filter(Boolean);
    if (cuenta.length > 0 && cuenta.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numeroCuenta"],
        message: "Para dispersar hacen falta banco, tipo de cuenta y número; o los tres o ninguno."
      });
    }

    /* La cuenta debe estar a nombre del comercio. Dispersar a un tercero es
       exactamente lo que la norma persigue, y comparar los documentos es la
       única forma de comprobarlo desde aquí. */
    if (p.titularDocumento && normalizar(p.titularDocumento) !== normalizar(p.numeroDocumento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["titularDocumento"],
        message:
          "El documento del titular de la cuenta no coincide con el del comercio. No se dispersa a cuentas de terceros."
      });
    }
  });

function normalizar(doc: string): string {
  return doc.replace(/[.\s-]/g, "");
}

export type PerfilComercio = z.infer<typeof PerfilComercioSchema>;
export type BeneficiarioFinal = z.infer<typeof BeneficiarioFinalSchema>;

/** Alta completa: identidad mínima del tenant + su perfil. */
export const CrearComercioSchema = z.object({
  legalName: z.string().trim().min(3).max(200),
  displayName: z.string().trim().min(2).max(100),
  perfil: PerfilComercioSchema
});

export type CrearComercioBody = z.infer<typeof CrearComercioSchema>;
