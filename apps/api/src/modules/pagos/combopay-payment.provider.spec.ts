import { afterEach, describe, expect, it, vi } from "vitest";
import { ComboPayPaymentProvider, mapTransactionState } from "./combopay-payment.provider";

const INPUT = {
  merchantId: "33333333-3333-4333-8333-333333333333",
  montoMinor: 100000,
  moneda: "COP" as const,
  referencia: "cuota-marzo",
  descripcion: "Cuota de administración marzo"
};

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ComboPayPaymentProvider — crearCobro", () => {
  it("CA-2: envía value, invoice=idempotencyKey y Bearer; mapea id y payment_link", async () => {
    const fetchMock = mockFetch({
      id: 1003455,
      invoice: "LK1003455",
      value: 100000,
      payment_link: "https://combopay.co/payment-link/evetev/LK1003455",
      status: 0
    });
    const provider = new ComboPayPaymentProvider("tok-secreto");

    const cobro = await provider.crearCobro(INPUT, "idem-123");

    expect(cobro).toEqual({
      providerPaymentId: "1003455",
      estado: "pendiente",
      checkoutUrl: "https://combopay.co/payment-link/evetev/LK1003455"
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api-gateway.combopay.co/api/invoice-company-customer");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok-secreto");
    expect(JSON.parse(init.body as string)).toEqual({
      value: 100000,
      description: "Cuota de administración marzo",
      invoice: "idem-123"
    });
  });

  it("CA-3: rechaza monedas distintas de COP sin llamar a ComboPay", async () => {
    const fetchMock = mockFetch({});
    const provider = new ComboPayPaymentProvider("tok");

    await expect(provider.crearCobro({ ...INPUT, moneda: "USD" }, "idem-1")).rejects.toThrow(
      /solo transa COP/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un body de error con HTTP 200 (estilo ComboPay) también falla", async () => {
    mockFetch({ error: "Error al generar la transacción.", response_code: 200 });
    const provider = new ComboPayPaymentProvider("tok");

    await expect(provider.crearCobro(INPUT, "idem-1")).rejects.toThrow(/rechazó la factura/);
  });

  it("HTTP no-2xx falla con el status", async () => {
    mockFetch({}, 500);
    const provider = new ComboPayPaymentProvider("tok");

    await expect(provider.crearCobro(INPUT, "idem-1")).rejects.toThrow(/500/);
  });

  it("acepta un baseUrl alterno (sandbox)", async () => {
    const fetchMock = mockFetch({ id: 7, status: 0 });
    const provider = new ComboPayPaymentProvider("tok", "https://sandbox.combopay.co");

    await provider.crearCobro(INPUT, "idem-1");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://sandbox.combopay.co/api/invoice-company-customer");
  });
});

describe("ComboPayPaymentProvider — verificarEstado (CA-4)", () => {
  it("payment_approved → aprobado", async () => {
    const fetchMock = mockFetch({
      transaction_state: "payment_approved",
      transaction_value: 100000,
      unique_transaction_code: "77926584888"
    });
    const provider = new ComboPayPaymentProvider("tok");

    expect(await provider.verificarEstado("1003455")).toBe("aprobado");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://api-gateway.combopay.co/api/invoice/1003455/status");
  });

  it("payment_fail → fallido; lo demás → pendiente", () => {
    expect(mapTransactionState("payment_fail")).toBe("fallido");
    expect(mapTransactionState("payment_pending")).toBe("pendiente");
    expect(mapTransactionState(undefined)).toBe("pendiente");
    expect(mapTransactionState("algo_nuevo")).toBe("pendiente");
  });

  it("factura sin transacción todavía (body de error) → pendiente", async () => {
    mockFetch({ error: "No existe ninguna instancia de invoice…", response_code: 404 });
    const provider = new ComboPayPaymentProvider("tok");

    expect(await provider.verificarEstado("1003455")).toBe("pendiente");
  });
});

describe("ComboPayPaymentProvider — capacidades no soportadas", () => {
  it("CA-8: listarLiquidaciones falla explícito, nunca lista vacía falsa", async () => {
    const provider = new ComboPayPaymentProvider("tok");
    await expect(
      provider.listarLiquidaciones({
        desde: "2026-09-01T00:00:00.000Z",
        hasta: "2026-09-02T00:00:00.000Z"
      })
    ).rejects.toThrow(/no expone liquidaciones/);
  });

  it("CA-9: crearMerchant falla explícito (alta manual en su dashboard)", async () => {
    const provider = new ComboPayPaymentProvider("tok");
    await expect(provider.crearMerchant({ legalName: "Conjunto X" })).rejects.toThrow(
      /alta es manual/
    );
  });
});
