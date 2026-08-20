import { describe, expect, it } from "vitest";
import type { Fragmento } from "../base/tipos";
import { verificar } from "./salida";

function frag(id: string, texto: string): Fragmento {
  return {
    id,
    documentoId: id.split("#")[0] ?? id,
    titulo: "T",
    seccion: "S",
    texto,
    contexto: "",
    producto: "evepay",
    audiencia: "comercio",
    confianza: "alta",
    vigencia: "2027-01-01"
  };
}

const entregados = [
  frag(
    "evepay-tarifas#1",
    "Cobramos un porcentaje por transaccion mas un componente fijo. Escribe a contacto@evetev.com."
  ),
  frag("evepay-estado#1", "EvePay todavia no esta en produccion. Hay 3 pasos para cobrar.")
];

describe("verificacion de la salida", () => {
  it("acepta una respuesta anclada y bien citada", () => {
    const r = "EvePay todavia no esta en produccion [#evepay-estado#1].";
    expect(verificar(r, entregados)).toEqual({ valida: true });
  });

  it("tumba una cita a un fragmento que no se le entrego", () => {
    // Es el fallo de eve-studio: la regla que pedia citar fabricaba la cita.
    const r = "Segun nuestra documentacion [#evepay-inventado#9] si esta listo.";
    const v = verificar(r, entregados);
    expect(v.valida).toBe(false);
    if (!v.valida) expect(v.motivo).toBe("cita inexistente");
  });

  it("tumba una cifra que no esta en el contexto", () => {
    const r = "Cobramos 2,9% por transaccion [#evepay-tarifas#1].";
    const v = verificar(r, entregados);
    expect(v.valida).toBe(false);
    if (!v.valida) expect(v.detalle).toContain("2,9");
  });

  it("no confunde el numero del identificador con una cifra de la respuesta", () => {
    const r = "Son 3 pasos [#evepay-estado#1].";
    expect(verificar(r, entregados)).toEqual({ valida: true });
  });

  it("tumba un correo o enlace que el modelo se invento", () => {
    const r = "Escribe a ventas@evetev.com [#evepay-tarifas#1].";
    const v = verificar(r, entregados);
    expect(v.valida).toBe(false);
    if (!v.valida) expect(v.motivo).toBe("enlace inventado");
  });

  it("acepta el correo que si estaba en el contexto", () => {
    const r = "Escribe a contacto@evetev.com [#evepay-tarifas#1].";
    expect(verificar(r, entregados)).toEqual({ valida: true });
  });

  it("acepta el correo que autoriza el prompt aunque no este en los fragmentos", () => {
    // El prompt manda ofrecer el contacto. Prohibirlo era tumbar respuestas
    // buenas por obedecer nuestra propia instruccion.
    const r = "Eso no lo tengo. Escribe a soporte@evetev.com [#evepay-estado#1].";
    expect(verificar(r, entregados, ["soporte@evetev.com"])).toEqual({ valida: true });
  });

  it("sigue tumbando un enlace que ni el contexto ni el prompt autorizan", () => {
    const r = "Mira en https://otra-cosa.com [#evepay-estado#1].";
    const v = verificar(r, entregados, ["contacto@evetev.com"]);
    expect(v.valida).toBe(false);
  });
});
