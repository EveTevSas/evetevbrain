import { describe, it, expect } from "vitest";
import {
  ventasGalones,
  ventasPesos,
  totalVentasPesos,
  totalTarjetas,
  totalTransportadora,
  totalFaltantesNetos,
  totalRegistrado,
  comprobacion,
  arqueoCuadrado,
  validarLectura,
  redondear,
  existenciaTeorica,
  variacion,
  alertaMerma,
  rangoAging,
  semaforoAging,
  aplicarFifo,
  saldoCliente,
  margenPorGalon,
  utilidadBruta
} from "./calc";

describe("Regla 2: Ventas Galones", () => {
  it("final - inicial - calibración", () => {
    expect(
      ventasGalones({ lecturaInicial: 1000, lecturaFinal: 1520.5, calibracion: 20.5, precio: 0 })
    ).toBe(500);
  });

  it("sin calibración", () => {
    expect(
      ventasGalones({ lecturaInicial: 0, lecturaFinal: 123.456, calibracion: 0, precio: 0 })
    ).toBeCloseTo(123.456);
  });
});

describe("Regla 3: Ventas Pesos", () => {
  it("galones × precio redondeado a 2 decimales", () => {
    // 100 galones a 15999.9 => 1.599.990
    expect(
      ventasPesos({ lecturaInicial: 0, lecturaFinal: 100, calibracion: 0, precio: 15999.9 })
    ).toBe(1599990);
  });

  it("redondeo a 2 decimales", () => {
    // 3.333 galones × 10000 = 33330,005... → 33330.01
    expect(
      ventasPesos({ lecturaInicial: 0, lecturaFinal: 3.333, calibracion: 0, precio: 10000 })
    ).toBe(33330);
    expect(redondear(1.005)).toBe(1.01);
  });

  it("total de ventas suma las lecturas", () => {
    const lecturas = [
      { lecturaInicial: 0, lecturaFinal: 10, calibracion: 0, precio: 1000 },
      { lecturaInicial: 5, lecturaFinal: 25, calibracion: 5, precio: 2000 }
    ];
    expect(totalVentasPesos(lecturas)).toBe(10000 + 30000);
  });
});

describe("Regla 5: arqueo y comprobación", () => {
  const arqueoBase = {
    efectivo: 50000,
    pagos: [
      { tipo: "CREDIBANCO" as const, valor: 20000 },
      { tipo: "REDEBAN" as const, valor: 10000 },
      { tipo: "TRANSPORTADORA" as const, valor: 5000 },
      { tipo: "OTRO" as const, valor: 777 } // OTRO no entra en el arqueo
    ],
    vales: [12000, 3000],
    faltantes: [
      { faltante: 8000, abono: 3000 }, // neto 5000
      { faltante: 2000, abono: 0 } // neto 2000
    ]
  };

  it("tarjetas = credibanco + redeban", () => {
    expect(totalTarjetas(arqueoBase.pagos)).toBe(30000);
  });

  it("transportadora solo suma TRANSPORTADORA", () => {
    expect(totalTransportadora(arqueoBase.pagos)).toBe(5000);
  });

  it("faltantes netos = Σ(faltante - abono)", () => {
    expect(totalFaltantesNetos(arqueoBase.faltantes)).toBe(7000);
  });

  it("total registrado = efectivo + tarjetas + transportadora + vales + faltantes netos", () => {
    // 50000 + 30000 + 5000 + 15000 + 7000 = 107000
    expect(totalRegistrado(arqueoBase)).toBe(107000);
  });

  it("caso cuadrado en $0 permite el cierre", () => {
    expect(comprobacion(107000, arqueoBase)).toBe(0);
    expect(arqueoCuadrado(107000, arqueoBase)).toBe(true);
  });

  it("caso descuadrado bloquea el cierre", () => {
    expect(comprobacion(100000, arqueoBase)).toBe(-7000);
    expect(arqueoCuadrado(100000, arqueoBase)).toBe(false);
    expect(arqueoCuadrado(110000, arqueoBase)).toBe(false);
  });

  it("comprobación cero exacto con decimales", () => {
    const a = {
      efectivo: 0.1,
      pagos: [{ tipo: "CREDIBANCO" as const, valor: 0.2 }],
      vales: [],
      faltantes: []
    };
    expect(comprobacion(0.3, a)).toBe(0);
    expect(arqueoCuadrado(0.3, a)).toBe(true);
  });
});

describe("Regla 4: validaciones duras", () => {
  const valida = { lecturaInicial: 100, lecturaFinal: 200, calibracion: 50, precio: 16000 };

  it("lectura válida no produce errores", () => {
    expect(validarLectura(valida)).toEqual([]);
  });

  it("final < inicial es error", () => {
    const errores = validarLectura({ ...valida, lecturaFinal: 50, calibracion: 0 });
    expect(errores.some((e) => e.includes("mayor o igual a la inicial"))).toBe(true);
  });

  it("calibración mayor que la diferencia es error", () => {
    const errores = validarLectura({ ...valida, calibracion: 150 });
    expect(errores.some((e) => e.includes("calibración"))).toBe(true);
  });

  it("calibración igual a la diferencia es válido (venta 0)", () => {
    expect(validarLectura({ ...valida, calibracion: 100 })).toEqual([]);
  });

  it("valores negativos son error", () => {
    for (const l of [
      { ...valida, lecturaInicial: -1 },
      { ...valida, lecturaFinal: -1 },
      { ...valida, calibracion: -1 },
      { ...valida, precio: -1 }
    ]) {
      expect(validarLectura(l).length).toBeGreaterThan(0);
    }
  });
});

describe("Módulo 2: inventarios", () => {
  it("existencia teórica = inicial + compras - ventas", () => {
    expect(existenciaTeorica(1000, 5000, 4200)).toBeCloseTo(1800);
    expect(existenciaTeorica(0, 0, 0)).toBe(0);
  });

  it("variación = físico - teórica (positiva y negativa)", () => {
    expect(variacion(1810, 1800)).toBeCloseTo(10);
    expect(variacion(1790, 1800)).toBeCloseTo(-10);
    expect(variacion(1800, 1800)).toBe(0);
  });

  it("alerta bajo el umbral no dispara", () => {
    // 0.5% de 1800 = 9; variación 5 está por debajo
    expect(alertaMerma(5, 1800)).toBe(false);
    expect(alertaMerma(-5, 1800)).toBe(false);
  });

  it("alerta sobre el umbral dispara", () => {
    expect(alertaMerma(10, 1800)).toBe(true);
    expect(alertaMerma(-10, 1800)).toBe(true);
  });

  it("mínimo de 1 galón evita ruido con cifras pequeñas", () => {
    // 0.5% de 100 = 0.5, pero el mínimo es 1 gal
    expect(alertaMerma(0.8, 100)).toBe(false);
    expect(alertaMerma(1.2, 100)).toBe(true);
  });
});

describe("Módulo 3: cartera", () => {
  describe("rangoAging: los 7 rangos del Excel", () => {
    it("bordes de cada rango", () => {
      expect(rangoAging(0)).toBe("0-30");
      expect(rangoAging(30)).toBe("0-30");
      expect(rangoAging(31)).toBe("31-60");
      expect(rangoAging(60)).toBe("31-60");
      expect(rangoAging(61)).toBe("61-90");
      expect(rangoAging(90)).toBe("61-90");
      expect(rangoAging(91)).toBe("91-120");
      expect(rangoAging(120)).toBe("91-120");
      expect(rangoAging(121)).toBe("121-180");
      expect(rangoAging(180)).toBe("121-180");
      expect(rangoAging(181)).toBe("181-360");
      expect(rangoAging(360)).toBe("181-360");
      expect(rangoAging(361)).toBe(">360");
    });
  });

  describe("semaforoAging", () => {
    it("verde ≤30, ámbar 31–90, rojo >90", () => {
      expect(semaforoAging(30)).toBe("verde");
      expect(semaforoAging(31)).toBe("ambar");
      expect(semaforoAging(90)).toBe("ambar");
      expect(semaforoAging(91)).toBe("rojo");
    });
  });

  describe("aplicarFifo: el abono mata primero la factura más vieja", () => {
    const facturas = [
      { id: "f1", total: 100000 },
      { id: "f2", total: 50000 },
      { id: "f3", total: 80000 }
    ];

    it("sin abonos todo queda pendiente", () => {
      const p = aplicarFifo(facturas, 0);
      expect(p.get("f1")).toBe(100000);
      expect(p.get("f2")).toBe(50000);
      expect(p.get("f3")).toBe(80000);
    });

    it("abono parcial cubre solo la más vieja", () => {
      const p = aplicarFifo(facturas, 60000);
      expect(p.get("f1")).toBe(40000);
      expect(p.get("f2")).toBe(50000);
      expect(p.get("f3")).toBe(80000);
    });

    it("abono que cubre varias facturas en orden", () => {
      const p = aplicarFifo(facturas, 120000);
      expect(p.get("f1")).toBe(0);
      expect(p.get("f2")).toBe(30000);
      expect(p.get("f3")).toBe(80000);
    });

    it("abono mayor que la deuda deja todo en cero", () => {
      const p = aplicarFifo(facturas, 999999);
      expect(p.get("f1")).toBe(0);
      expect(p.get("f2")).toBe(0);
      expect(p.get("f3")).toBe(0);
    });
  });

  describe("saldoCliente", () => {
    it("vales − abonos, redondeado a 2 decimales", () => {
      expect(saldoCliente(200000, 75000)).toBe(125000);
      expect(saldoCliente(0.3, 0.1)).toBe(0.2);
    });
  });
});

describe("Módulo 4: financiero", () => {
  it("margen = P/VENTA − P/COMPRA − FLETE (ejemplo del PDF)", () => {
    // Corriente: vende a $15.980, compra a $15.050,77, flete $140 → $789,23/gal
    expect(margenPorGalon(15980, 15050.77, 140)).toBe(789.23);
  });

  it("margen negativo se muestra tal cual", () => {
    expect(margenPorGalon(15000, 15050.77, 140)).toBe(-190.77);
  });

  it("utilidad bruta = margen × galones acumulados", () => {
    expect(utilidadBruta(789.23, 10000)).toBe(7892300);
    expect(utilidadBruta(0, 10000)).toBe(0);
  });
});
