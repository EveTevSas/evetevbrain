import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  canSeeNavigation,
  initialsFor,
  isSafeInternalPath,
  roleLabels
} from "./permissions";

describe("autorización de EveConecta", () => {
  it("reserva comunidad y auditoría para roles administrativos", () => {
    expect(canAccessPath("admin_conjunto", "/comunidad")).toBe(true);
    expect(canAccessPath("residente", "/comunidad")).toBe(false);
    expect(canAccessPath("consejo", "/auditoria")).toBe(false);
    expect(canAccessPath("super_admin", "/auditoria")).toBe(true);
    expect(canAccessPath("super_admin", "/ruta-no-registrada")).toBe(false);
  });

  it("permite que residentes consulten sus finanzas y servicios comunitarios", () => {
    expect(canSeeNavigation("residente", "/finanzas")).toBe(true);
    expect(canSeeNavigation("residente", "/reservas")).toBe(true);
    expect(canSeeNavigation("residente", "/presupuesto")).toBe(false);
  });

  it("rechaza destinos externos en redirecciones posteriores al login", () => {
    expect(isSafeInternalPath("/finanzas?periodo=2026-07")).toBe(true);
    expect(isSafeInternalPath("//sitio-malicioso.test")).toBe(false);
    expect(isSafeInternalPath("https://sitio-malicioso.test")).toBe(false);
  });

  it("presenta nombres de rol e iniciales legibles", () => {
    expect(roleLabels.admin_conjunto).toBe("Administración");
    expect(initialsFor("Laura Gómez", "laura@example.com")).toBe("LG");
    expect(initialsFor("", "residente@example.com")).toBe("R");
  });
});
