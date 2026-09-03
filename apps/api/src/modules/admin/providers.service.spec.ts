import { afterEach, describe, expect, it, vi } from "vitest";
import type { PaymentProvider } from "@evetev/shared";
import { ComboPayPaymentProvider } from "../pagos/combopay-payment.provider";
import { FakePaymentProvider } from "../pagos/fake-payment.provider";
import { ProvidersService } from "./providers.service";

const TOKEN_SECRETO = "tok_super_secreto_de_combopay_123456";

function servicioCon(provider: PaymentProvider) {
  return new ProvidersService(provider);
}

afterEach(() => {
  for (const v of [
    "COMBOPAY_API_TOKEN",
    "COMBOPAY_WEBHOOK_SECRET",
    "COMBOPAY_BASE_URL",
    "AKUA_CLIENT_ID",
    "AKUA_CLIENT_SECRET",
    "AKUA_WEBHOOK_SECRET"
  ]) {
    delete process.env[v];
  }
  vi.unstubAllGlobals();
});

describe("ProvidersService — estado de la adquirencia (CA-11)", () => {
  it("marca como activo el proveedor que atiende los cobros", () => {
    const estado = servicioCon(new ComboPayPaymentProvider("tok")).estado();

    expect(estado.activo).toBe("combopay");
    expect(estado.proveedores.find((p) => p.nombre === "combopay")?.activo).toBe(true);
    expect(estado.proveedores.find((p) => p.nombre === "akua")?.activo).toBe(false);
  });

  it("lista los tres proveedores con sus capacidades", () => {
    const { proveedores } = servicioCon(new FakePaymentProvider()).estado();

    expect(proveedores.map((p) => p.nombre)).toEqual(["combopay", "akua", "fake"]);

    const combopay = proveedores.find((p) => p.nombre === "combopay")!;
    expect(combopay.capacidades).toEqual({
      altaDeComercios: false,
      liquidaciones: false,
      monedas: ["COP"]
    });
  });

  /* §4: la consola necesita saber si falta un secreto, no cuál es. Un descuido
     aquí publicaría el token de la adquirencia en el HTML de una página. */
  it("informa la PRESENCIA de cada credencial, nunca su valor", () => {
    process.env.COMBOPAY_API_TOKEN = TOKEN_SECRETO;
    const estado = servicioCon(new FakePaymentProvider()).estado();

    const combopay = estado.proveedores.find((p) => p.nombre === "combopay")!;
    const token = combopay.configuracion.find((c) => c.nombre === "COMBOPAY_API_TOKEN")!;
    expect(token.presente).toBe(true);

    // Ni el valor completo ni un fragmento suyo aparecen en la respuesta.
    const serializado = JSON.stringify(estado);
    expect(serializado).not.toContain(TOKEN_SECRETO);
    expect(serializado).not.toContain(TOKEN_SECRETO.slice(0, 12));
  });

  it("una variable vacía cuenta como ausente", () => {
    process.env.COMBOPAY_API_TOKEN = "   ";
    const { proveedores } = servicioCon(new FakePaymentProvider()).estado();

    const token = proveedores
      .find((p) => p.nombre === "combopay")!
      .configuracion.find((c) => c.nombre === "COMBOPAY_API_TOKEN")!;
    expect(token.presente).toBe(false);
  });

  it("la URL del webhook se muestra como forma, con el secreto sin resolver", () => {
    process.env.COMBOPAY_WEBHOOK_SECRET = "s3creto-de-verdad";
    const { proveedores } = servicioCon(new FakePaymentProvider()).estado();

    const combopay = proveedores.find((p) => p.nombre === "combopay")!;
    expect(combopay.webhook).toBe("/v1/webhooks/combopay/<COMBOPAY_WEBHOOK_SECRET>");
    expect(JSON.stringify(combopay)).not.toContain("s3creto-de-verdad");
  });
});

describe("ProvidersService — checklist de habilitación (CA-13)", () => {
  it("sin credenciales, los pasos automáticos salen pendientes", () => {
    const { proveedores } = servicioCon(new FakePaymentProvider()).estado();
    const checklist = proveedores.find((p) => p.nombre === "combopay")!.checklist;

    expect(checklist.find((p) => p.descripcion.includes("Token"))?.estado).toBe("pendiente");
    expect(checklist.find((p) => p.descripcion.includes("Secreto"))?.estado).toBe("pendiente");
  });

  it("con las credenciales puestas, esos pasos pasan a listo", () => {
    process.env.COMBOPAY_API_TOKEN = "tok";
    process.env.COMBOPAY_WEBHOOK_SECRET = "sec";
    const { proveedores } = servicioCon(new FakePaymentProvider()).estado();
    const checklist = proveedores.find((p) => p.nombre === "combopay")!.checklist;

    expect(checklist.find((p) => p.descripcion.includes("Token"))?.estado).toBe("listo");
    expect(checklist.find((p) => p.descripcion.includes("Secreto"))?.estado).toBe("listo");
  });

  /* Lo que no se puede comprobar desde aquí se dice, no se da por hecho: un
     paso manual marcado como "listo" sin haberlo verificado es peor que uno
     pendiente, porque cierra la pregunta con una respuesta falsa. */
  it("los pasos que dependen del panel del proveedor quedan como manuales", () => {
    process.env.COMBOPAY_API_TOKEN = "tok";
    process.env.COMBOPAY_WEBHOOK_SECRET = "sec";
    const { proveedores } = servicioCon(new FakePaymentProvider()).estado();
    const checklist = proveedores.find((p) => p.nombre === "combopay")!.checklist;

    const manuales = checklist.filter((p) => p.estado === "manual");
    expect(manuales).toHaveLength(2);
    expect(manuales.every((p) => (p.nota ?? "").length > 0)).toBe(true);
  });

  it("avisa cuando el proveedor simulado es el que está activo", () => {
    const { proveedores } = servicioCon(new FakePaymentProvider()).estado();
    const fake = proveedores.find((p) => p.nombre === "fake")!;

    const aviso = fake.checklist.find((p) => p.descripcion.includes("producción"))!;
    expect(aviso.estado).toBe("manual");
    expect(aviso.nota).toContain("fallo grave en producción");
  });
});

describe("ProvidersService — salud del proveedor activo (CA-12)", () => {
  it("el fake responde sano sin salir a la red", async () => {
    const salud = await servicioCon(new FakePaymentProvider()).salud();

    expect(salud.ok).toBe(true);
    expect(salud.proveedor).toBe("fake");
  });

  /* La comprobación tiene que pegarle a un endpoint que EXIJA el token. El
     primer intento usó /api/bank-list, que resultó ser público: devolvía 200
     con un token inventado y la consola informaba "el token es válido" sin
     haber validado nada. Se descubrió probando la salud con un token falso a
     propósito, no con los tests. */
  it("ComboPay pega a un endpoint autenticado, de solo lectura y sin dinero", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const salud = await servicioCon(new ComboPayPaymentProvider("tok")).salud();

    // 404 = autenticó y la factura no existe, que es lo que se buscaba.
    expect(salud.ok).toBe(true);
    expect(salud.detalle).toContain("el token autentica");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api-gateway.combopay.co/api/invoice/0/status");
    expect(init?.method ?? "GET").toBe("GET");
    // El endpoint público NO sirve para esto.
    expect(url).not.toContain("bank-list");
  });

  it("un 200 inesperado también cuenta como autenticado", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ transaction_state: "x" })));

    const salud = await servicioCon(new ComboPayPaymentProvider("tok")).salud();
    expect(salud.ok).toBe(true);
  });

  it("un estado inesperado (500) no se da por sano", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));

    const salud = await servicioCon(new ComboPayPaymentProvider("tok")).salud();
    expect(salud.ok).toBe(false);
    expect(salud.detalle).toContain("500");
  });

  it("un token rechazado se reporta como no sano, sin lanzar", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 401 }));

    const salud = await servicioCon(new ComboPayPaymentProvider("tok-malo")).salud();

    expect(salud.ok).toBe(false);
    expect(salud.detalle).toContain("rechazó el token");
  });

  it("si el proveedor no responde, lo dice en vez de romper la consola", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    });

    const salud = await servicioCon(new ComboPayPaymentProvider("tok")).salud();

    expect(salud.ok).toBe(false);
    expect(salud.detalle).toContain("No se pudo contactar");
  });

  it("sin token configurado no sale a la red: lo dice de una vez", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const salud = await servicioCon(new ComboPayPaymentProvider("")).salud();

    expect(salud.ok).toBe(false);
    expect(salud.detalle).toContain("Falta COMBOPAY_API_TOKEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
