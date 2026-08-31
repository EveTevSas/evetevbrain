import { describe, expect, it } from "vitest";
import { selectActiveMembership, type MembershipRow } from "./resolve-membership";

const memberships: MembershipRow[] = [
  { conjunto_id: "conjunto-a", rol: "admin_conjunto" },
  { conjunto_id: "conjunto-b", rol: "residente" }
];

describe("selectActiveMembership", () => {
  it("honra el conjunto activo pedido por cookie cuando hay membresía", () => {
    const membership = selectActiveMembership(memberships, "conjunto-b");

    expect(membership).toEqual({ conjuntoId: "conjunto-b", role: "residente" });
  });

  it("usa la membresía más antigua cuando no hay cookie", () => {
    const membership = selectActiveMembership(memberships, undefined);

    expect(membership).toEqual({ conjuntoId: "conjunto-a", role: "admin_conjunto" });
  });

  it("ignora una cookie que apunta a un conjunto sin membresía", () => {
    const membership = selectActiveMembership(memberships, "conjunto-ajeno");

    expect(membership).toEqual({ conjuntoId: "conjunto-a", role: "admin_conjunto" });
  });

  it("devuelve null sin membresías", () => {
    expect(selectActiveMembership([], "conjunto-a")).toBeNull();
  });

  it("devuelve null cuando el rol de la membresía elegida no es válido", () => {
    const membership = selectActiveMembership(
      [{ conjunto_id: "conjunto-a", rol: "portero" }],
      undefined
    );

    expect(membership).toBeNull();
  });
});
