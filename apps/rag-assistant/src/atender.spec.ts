import { describe, expect, it } from "vitest";
import { atender, type ContextoCompleto } from "./atender";
import { cargar } from "./cargar";
import type { Motor, PeticionModelo, RespuestaModelo, Uso } from "./generar/motor";

const USO: Uso = { tokensEntrada: 100, tokensSalida: 20, tokensCacheados: 0, milisegundos: 1 };

/** Motor falso: devuelve lo que se le diga, sin red. Los tests de la generacion
 *  anclada no dependen de que un proveedor este arriba ni gastan un token. */
function motorFalso(texto: string | ((p: PeticionModelo) => string)): Motor {
  return {
    nombre: "falso",
    async generar(p: PeticionModelo): Promise<RespuestaModelo> {
      return { texto: typeof texto === "function" ? texto(p) : texto, uso: USO };
    },
    async *generarEnTrozos(p: PeticionModelo) {
      yield typeof texto === "function" ? texto(p) : texto;
      return USO;
    }
  };
}

const indice = cargar();
function ctx(motor: Motor): ContextoCompleto {
  return { indice, motor };
}

const PREGUNTA = "quien autoriza los gastos del conjunto";

describe("el turno completo", () => {
  it("no llama al modelo cuando la respuesta esta sellada", async () => {
    let llamado = false;
    const motor = motorFalso(() => {
      llamado = true;
      return "no deberia pasar";
    });
    const r = await atender("como cobran?", ctx(motor));
    expect(r.camino).toBe("sellada");
    expect(llamado).toBe(false);
  });

  it("no llama al modelo cuando se abstiene", async () => {
    let llamado = false;
    const motor = motorFalso(() => {
      llamado = true;
      return "no deberia pasar";
    });
    const r = await atender("cual es la capital de Francia", ctx(motor));
    expect(r.camino).toBe("abstencion");
    expect(llamado).toBe(false);
  });

  it("devuelve la respuesta del modelo cuando esta anclada", async () => {
    const motor = motorFalso("Aprobar un gasto no lo paga [#eveconecta-aprobaciones#2].");
    const r = await atender(PREGUNTA, ctx(motor));
    expect(r.camino).toBe("generada");
    expect(r.respuesta).toContain("Aprobar un gasto no lo paga");
  });

  it("descarta y deriva cuando el modelo cita algo que no recibio", async () => {
    const motor = motorFalso("Lo dice nuestra documentacion [#inventado#1].");
    const r = await atender(PREGUNTA, ctx(motor));
    expect(r.camino).toBe("descartada");
    expect(r.descarte).toContain("cita inexistente");
    expect(r.respuesta).toContain("contacto@evetev.com");
  });

  it("descarta y deriva cuando el modelo se inventa una cifra", async () => {
    const motor = motorFalso("Se aprueban en 48 horas [#eveconecta-aprobaciones#1].");
    const r = await atender(PREGUNTA, ctx(motor));
    expect(r.camino).toBe("descartada");
    expect(r.descarte).toContain("cifra inventada");
  });

  it("le pasa al modelo los fragmentos con su identificador", async () => {
    let visto = "";
    const motor = motorFalso((p) => {
      visto = p.usuario;
      return "Sin citas.";
    });
    await atender(PREGUNTA, ctx(motor));
    expect(visto).toContain("[#eveconecta-aprobaciones#");
    expect(visto).toContain(`Pregunta: ${PREGUNTA}`);
  });

  it("manda el prompt de anclaje como sistema, sin la nota interna", async () => {
    let sistema = "";
    const motor = motorFalso((p) => {
      sistema = p.sistema;
      return "Sin citas.";
    });
    await atender(PREGUNTA, ctx(motor));
    expect(sistema).toContain("Eres **Eve**");
    expect(sistema).not.toContain("verificador");
  });
});
