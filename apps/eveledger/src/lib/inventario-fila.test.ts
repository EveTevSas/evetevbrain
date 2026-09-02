import { describe, it, expect } from "vitest";
import { armarFilaInventario } from "./calc";

// La regla protegida aquí es la propagación de null: "no digitado" no es 0.
// Un físico en 0 es un tanque vacío; un null es un dato que falta, y todo lo
// derivado de él (teórica, variación, alerta) debe quedar en null, nunca en un
// cero inventado.
describe("armarFilaInventario: derivación de la fila del día", () => {
  it("con todos los datos deriva teórica, variación y alerta", () => {
    const fila = armarFilaInventario(1000, 500, 300, 1195);
    expect(fila.teorica).toBe(1200); // 1000 + 500 - 300
    expect(fila.variacion).toBe(-5); // 1195 - 1200
    expect(fila.alerta).toBe(false); // umbral = max(1, 0.5% × 1200) = 6
  });

  it("una merma sobre el umbral dispara la alerta", () => {
    const fila = armarFilaInventario(1000, 500, 300, 1190);
    expect(fila.variacion).toBe(-10);
    expect(fila.alerta).toBe(true); // |−10| > 6
  });

  it("sin inicial (ayer no se digitó físico) no hay teórica ni derivados", () => {
    const fila = armarFilaInventario(null, 500, 300, 1195);
    expect(fila.teorica).toBeNull();
    expect(fila.variacion).toBeNull();
    expect(fila.alerta).toBe(false);
  });

  it("sin ventas (cierre no CLOSED) no hay teórica ni derivados", () => {
    const fila = armarFilaInventario(1000, 500, null, 1195);
    expect(fila.teorica).toBeNull();
    expect(fila.variacion).toBeNull();
    expect(fila.alerta).toBe(false);
  });

  it("sin físico digitado hay teórica pero no variación ni alerta", () => {
    const fila = armarFilaInventario(1000, 500, 300, null);
    expect(fila.teorica).toBe(1200);
    expect(fila.variacion).toBeNull();
    expect(fila.alerta).toBe(false);
  });

  it("físico en 0 es un tanque vacío, no un dato faltante", () => {
    const fila = armarFilaInventario(10, 0, 8, 0);
    expect(fila.teorica).toBe(2);
    expect(fila.variacion).toBe(-2);
    expect(fila.alerta).toBe(true); // |−2| > max(1, 0.5% × 2) = 1
  });

  it("día sin compras usa 0, no null: las compras siempre están digitadas", () => {
    const fila = armarFilaInventario(1000, 0, 300, 700);
    expect(fila.teorica).toBe(700);
    expect(fila.variacion).toBe(0);
    expect(fila.alerta).toBe(false);
  });
});
