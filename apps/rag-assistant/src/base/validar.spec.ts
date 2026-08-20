import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { leerCrudos, type DocumentoCrudo } from "./leer";
import { leerReglas } from "./reglas";
import { validar, vencidos } from "./validar";

const BASE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "base");
const reglas = leerReglas(BASE);

const META_VALIDA = {
  id: "prueba",
  titulo: "Prueba",
  producto: "empresa",
  audiencia: "general",
  vigencia: "2027-01-01",
  fuente: "sitio-web",
  confianza: "alta"
};

function doc(
  cuerpo: string,
  meta: Partial<typeof META_VALIDA> = {},
  ruta = "empresa/x.md"
): DocumentoCrudo {
  return { ruta, meta: { ...META_VALIDA, ...meta }, cuerpo };
}

describe("el corpus real", () => {
  it("cumple sus propias reglas", () => {
    expect(validar(leerCrudos(BASE), reglas)).toEqual([]);
  });

  it("declara identificadores unicos", () => {
    const ids = leerCrudos(BASE).map((d) => d.meta["id"]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("frontmatter", () => {
  it("exige los siete campos", () => {
    const fallos = validar([doc("texto", { titulo: "" })], reglas);
    expect(fallos.map((f) => f.detalle)).toContain("falta «titulo»");
  });

  it("rechaza un valor fuera de la lista permitida", () => {
    const fallos = validar([doc("texto", { producto: "inventado" })], reglas);
    expect(fallos[0]?.tipo).toBe("frontmatter");
  });

  it("rechaza una vigencia que no es una fecha", () => {
    const fallos = validar([doc("texto", { vigencia: "pronto" })], reglas);
    expect(fallos.map((f) => f.detalle).join()).toContain("no es una fecha");
  });

  it("delata el id duplicado nombrando el otro archivo", () => {
    const fallos = validar([doc("a"), doc("b", {}, "empresa/y.md")], reglas);
    expect(fallos[0]?.tipo).toBe("id");
    expect(fallos[0]?.detalle).toContain("empresa/x.md");
  });
});

describe("reglas de contenido", () => {
  it("veta las frases que la compania decidio no decir", () => {
    const fallos = validar([doc("Cobramos tarifa fija sin porcentaje.")], reglas);
    expect(fallos.some((f) => f.tipo === "frase vetada")).toBe(true);
  });

  it("exige la negacion en la MISMA frase al hablar de disponibilidad", () => {
    expect(
      validar([doc("EvePay ya esta en produccion.")], reglas).some(
        (f) => f.tipo === "disponibilidad"
      )
    ).toBe(true);
    expect(validar([doc("EvePay todavia no esta en produccion.")], reglas)).toEqual([]);
  });

  it("no se deja enganar por un salto de linea del formateador", () => {
    // La negacion cae en la linea anterior. La frase completa es correcta.
    const cuerpo = "EvePay todavia no\nesta en produccion.";
    expect(validar([doc(cuerpo)], reglas)).toEqual([]);
  });

  it("exige que toda tarifa se declare de referencia", () => {
    const fallos = validar([doc("Cobramos un porcentaje por transaccion.")], reglas);
    expect(fallos.some((f) => f.tipo === "tarifa")).toBe(true);
  });

  it("acepta la tarifa cuando dice que es de referencia y deriva a cotizacion", () => {
    const cuerpo =
      "Cobramos un porcentaje por transaccion. Las cifras son de referencia; pide una cotizacion.";
    expect(validar([doc(cuerpo)], reglas)).toEqual([]);
  });

  it("no deja nombrar competidores fuera de legales", () => {
    expect(
      validar([doc("Somos mejores que Stripe.")], reglas).some((f) => f.tipo === "competidor")
    ).toBe(true);
  });

  it("veta las promesas de fecha", () => {
    expect(
      validar([doc("Estara listo en el primer trimestre.")], reglas).some(
        (f) => f.tipo === "promesa de fecha"
      )
    ).toBe(true);
  });

  it("no aplica las reglas de contenido a los archivos de configuracion", () => {
    // `_limites.md` describe las prohibiciones, asi que las contiene.
    const config = doc("prohibido decir tarifa fija sin porcentaje", {}, "_limites.md");
    expect(validar([config], reglas)).toEqual([]);
  });

  it("SI se las aplica a las respuestas selladas", () => {
    // Su texto es el que la persona recibe literalmente.
    const sellada = doc("tarifa fija sin porcentaje", {}, "_selladas.md");
    expect(validar([sellada], reglas).some((f) => f.tipo === "frase vetada")).toBe(true);
  });
});

describe("vigencia", () => {
  it("lista los vencidos sin tratarlos como fallo", () => {
    const viejo = doc("texto", { vigencia: "2020-01-01" });
    expect(validar([viejo], reglas)).toEqual([]);
    expect(vencidos([viejo]).map((d) => d.ruta)).toEqual(["empresa/x.md"]);
  });
});
