import { describe, expect, it } from "vitest";
import { PERMISOS, puede, rolesPara, type Accion } from "./permisos";

describe("permisos de la consola (rbac-operativo)", () => {
  it("todos los roles internos leen; nadie de fuera", () => {
    for (const rol of ["super_admin", "ops", "finanzas"]) expect(puede(rol, "leer")).toBe(true);
    expect(puede("admin_comercio", "leer")).toBe(false);
    expect(puede("", "leer")).toBe(false);
  });

  /* CA-3: la separación que importa. Quien prepara no aprueba ni paga; quien
     aprueba y paga no prepara. Tarifas y política de dispersión, solo dirección. */
  it("ops prepara lotes pero no los aprueba ni los paga; finanzas al revés", () => {
    expect(puede("ops", "lotes.preparar")).toBe(true);
    expect(puede("ops", "lotes.aprobar")).toBe(false);
    expect(puede("ops", "lotes.pagar")).toBe(false);
    expect(puede("finanzas", "lotes.preparar")).toBe(false);
    expect(puede("finanzas", "lotes.aprobar")).toBe(true);
    expect(puede("finanzas", "lotes.pagar")).toBe(true);
  });

  it("solo super_admin cambia tarifas y políticas de dispersión", () => {
    for (const accion of ["tarifas.escribir", "dispersion.politica"] as Accion[]) {
      expect(rolesPara(accion)).toEqual(["super_admin"]);
    }
  });

  it("el saldo del banco y las reservas son de finanzas; el primer cobro lo libera cualquiera del equipo", () => {
    expect(puede("ops", "recaudo.saldo")).toBe(false);
    expect(puede("finanzas", "recaudo.saldo")).toBe(true);
    expect(puede("ops", "retenciones.liberar_reserva")).toBe(false);
    expect(puede("ops", "retenciones.liberar_primer_cobro")).toBe(true);
  });

  it("super_admin está en todas las acciones", () => {
    for (const roles of Object.values(PERMISOS)) expect(roles).toContain("super_admin");
  });
});
