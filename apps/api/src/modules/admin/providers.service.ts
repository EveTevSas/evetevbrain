import { Inject, Injectable } from "@nestjs/common";
import type { CapacidadesProvider, PaymentProvider, SaludProvider } from "@evetev/shared";
import { PAYMENT_PROVIDER } from "../pagos/payment-provider.token";

/**
 * Estado de la adquirencia para la consola (CA-11 a CA-13 de admin-console).
 *
 * REGLA QUE MANDA AQUÍ (§4): de un secreto se reporta si ESTÁ, nunca su valor.
 * La consola necesita saber que falta el token de ComboPay; no necesita —ni
 * debe -- poder leerlo. Los valores viven solo en el gestor del entorno.
 */

/** Una variable de entorno que el proveedor necesita, y si está puesta. */
export interface VariableConfig {
  nombre: string;
  requerida: boolean;
  presente: boolean;
  /** Para qué sirve, en una línea. */
  para: string;
}

export type EstadoPaso = "listo" | "pendiente" | "manual";

/** Un paso de la habilitación del proveedor. */
export interface PasoHabilitacion {
  descripcion: string;
  estado: EstadoPaso;
  /** Por qué está en ese estado, o qué hay que hacer. */
  nota?: string;
}

export interface ProveedorInfo {
  nombre: string;
  /** El que atiende los cobros ahora mismo (PAYMENT_PROVIDER). */
  activo: boolean;
  descripcion: string;
  capacidades: CapacidadesProvider;
  configuracion: VariableConfig[];
  /** Forma de la URL del webhook; nunca incluye el secreto. */
  webhook: string | null;
  checklist: PasoHabilitacion[];
}

export interface EstadoProveedores {
  activo: string;
  proveedores: ProveedorInfo[];
}

/** true si la variable está definida y no vacía. Jamás devuelve su contenido. */
function presente(variable: string): boolean {
  return (process.env[variable] ?? "").trim().length > 0;
}

@Injectable()
export class ProvidersService {
  constructor(@Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider) {}

  /** Qué proveedor atiende los cobros ahora mismo. */
  nombreActivo(): string {
    return this.provider.nombre;
  }

  estado(): EstadoProveedores {
    const activo = this.provider.nombre;
    return {
      activo,
      proveedores: [this.combopay(activo), this.akua(activo), this.fake(activo)]
    };
  }

  /**
   * Comprobación real contra el proveedor ACTIVO (CA-12). Solo el activo: los
   * demás no tienen credenciales cargadas, así que preguntarles daría un "no
   * configurado" que ya dice el checklist, con la latencia de una llamada real.
   */
  async salud(): Promise<SaludProvider & { proveedor: string }> {
    const salud = await this.provider.verificarSalud();
    return { ...salud, proveedor: this.provider.nombre };
  }

  private combopay(activo: string): ProveedorInfo {
    const tokenListo = presente("COMBOPAY_API_TOKEN");
    const secretoListo = presente("COMBOPAY_WEBHOOK_SECRET");

    return {
      nombre: "combopay",
      activo: activo === "combopay",
      descripcion:
        "Adquirencia negociada (API Recaudos beta). EvePay opera como agregador con la cuenta de Evetev.",
      capacidades: { altaDeComercios: false, liquidaciones: false, monedas: ["COP"] },
      configuracion: [
        {
          nombre: "COMBOPAY_API_TOKEN",
          requerida: true,
          presente: tokenListo,
          para: "Bearer del dashboard de ComboPay (Perfil → Claves API)."
        },
        {
          nombre: "COMBOPAY_WEBHOOK_SECRET",
          requerida: true,
          presente: secretoListo,
          para: "Secreto nuestro que va en la URL del hook; es su única autenticación."
        },
        {
          nombre: "COMBOPAY_BASE_URL",
          requerida: false,
          presente: presente("COMBOPAY_BASE_URL"),
          para: "Solo para apuntar a un ambiente distinto del de producción."
        }
      ],
      webhook: "/v1/webhooks/combopay/<COMBOPAY_WEBHOOK_SECRET>",
      // Los pasos vienen de la tarea T6 de specs/evepay/provider-combopay/.
      checklist: [
        {
          descripcion: "Token de API configurado",
          estado: tokenListo ? "listo" : "pendiente",
          nota: tokenListo ? undefined : "Pídelo en el dashboard y ponlo en el entorno."
        },
        {
          descripcion: "Secreto del webhook generado",
          estado: secretoListo ? "listo" : "pendiente",
          nota: secretoListo
            ? undefined
            : "Genera 32 bytes aleatorios y ponlos en COMBOPAY_WEBHOOK_SECRET."
        },
        {
          descripcion: "URL del hook registrada en el dashboard de ComboPay",
          estado: "manual",
          nota: "Perfil → URL de notificación hook. No se puede comprobar desde aquí."
        },
        {
          descripcion: "Contrato de la API confirmado contra su ambiente de pruebas",
          estado: "manual",
          nota: "Tarea T6 de la spec: respuesta del alta de factura, invoice repetido sobre factura pagada, y campos reales del hook."
        }
      ]
    };
  }

  private akua(activo: string): ProveedorInfo {
    const credenciales = presente("AKUA_CLIENT_ID") && presente("AKUA_CLIENT_SECRET");

    return {
      nombre: "akua",
      activo: activo === "akua",
      descripcion:
        "Integración anterior, completa pero sin negociación vigente. Queda lista por si se retoma.",
      capacidades: { altaDeComercios: true, liquidaciones: true, monedas: ["COP", "USD"] },
      configuracion: [
        {
          nombre: "AKUA_CLIENT_ID",
          requerida: true,
          presente: presente("AKUA_CLIENT_ID"),
          para: "client_id de OAuth2."
        },
        {
          nombre: "AKUA_CLIENT_SECRET",
          requerida: true,
          presente: presente("AKUA_CLIENT_SECRET"),
          para: "client_secret de OAuth2."
        },
        {
          nombre: "AKUA_WEBHOOK_SECRET",
          requerida: true,
          presente: presente("AKUA_WEBHOOK_SECRET"),
          para: "Verifica la firma de sus webhooks (formato whsec_...)."
        }
      ],
      webhook: "/v1/webhooks/akua",
      checklist: [
        {
          descripcion: "Credenciales OAuth2 configuradas",
          estado: credenciales ? "listo" : "pendiente"
        },
        {
          descripcion: "Secreto de webhook configurado",
          estado: presente("AKUA_WEBHOOK_SECRET") ? "listo" : "pendiente"
        },
        {
          descripcion: "Acuerdo comercial vigente",
          estado: "manual",
          nota: "La negociación se detuvo; hoy la adquirencia es ComboPay."
        }
      ]
    };
  }

  private fake(activo: string): ProveedorInfo {
    return {
      nombre: "fake",
      activo: activo === "fake",
      descripcion:
        "Proveedor simulado para desarrollo y CI. Aprueba todo sin salir a la red; nunca en producción.",
      capacidades: { altaDeComercios: true, liquidaciones: true, monedas: ["COP", "USD"] },
      configuracion: [],
      webhook: null,
      checklist: [
        {
          descripcion: "No requiere configuración",
          estado: "listo"
        },
        {
          descripcion: "No debe quedar activo en producción",
          estado: activo === "fake" ? "manual" : "listo",
          nota:
            activo === "fake"
              ? "Está activo ahora: correcto en local, un fallo grave en producción."
              : undefined
        }
      ]
    };
  }
}
