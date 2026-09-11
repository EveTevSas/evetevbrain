import { describe, expect, it } from "vitest";
import { aCsv } from "./csv";

describe("aCsv", () => {
  it("separa con punto y coma, escapa comillas y saltos, y lleva BOM", () => {
    const csv = aCsv(
      [
        { nombre: 'Tienda "La 80"', monto: 48_572, nota: "línea 1\nlínea 2", vacio: null },
        { nombre: "El Tornillo; SAS", monto: 0, nota: "", vacio: undefined }
      ],
      [
        { titulo: "Comercio", valor: (f) => f.nombre },
        { titulo: "Monto", valor: (f) => f.monto },
        { titulo: "Nota", valor: (f) => f.nota },
        { titulo: "Vacío", valor: (f) => f.vacio }
      ]
    );
    expect(csv.startsWith("﻿")).toBe(true);
    const lineas = csv.slice(1).split("\r\n");
    expect(lineas[0]).toBe("Comercio;Monto;Nota;Vacío");
    expect(lineas[1]).toBe('"Tienda ""La 80""";48572;"línea 1\nlínea 2";');
    expect(lineas[2]).toBe('"El Tornillo; SAS";0;;');
  });

  it("sin filas deja solo la cabecera", () => {
    expect(aCsv([], [{ titulo: "A", valor: () => 1 }])).toBe("﻿A\r\n");
  });
});
