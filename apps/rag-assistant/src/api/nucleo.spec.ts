import { beforeEach, describe, expect, it } from "vitest";
import { cargar } from "../cargar";
import { reiniciarCupos } from "../guardas/cupos";
import { emitirSesion } from "../guardas/sesion";
import { leerEntorno, manejar, type Peticion } from "./nucleo";

const indice = cargar();
const entorno = leerEntorno({
  FLUXI_ORIGENES: "https://evetev.com",
  FLUXI_SECRETO: "secreto-de-prueba"
});
const ctx = { indice, entorno };

function peticion(p: Partial<Peticion>): Peticion {
  return {
    ruta: "/api/chat",
    metodo: "POST",
    origen: "https://evetev.com",
    ip: "1.2.3.4",
    ...p
  };
}

const sesion = () => emitirSesion(entorno.secreto);

beforeEach(reiniciarCupos);

describe("nucleo HTTP", () => {
  it("responde al vuelo previo sin exigir nada", async () => {
    const r = await manejar(peticion({ metodo: "OPTIONS" }), ctx);
    expect(r.estado).toBe(204);
  });

  it("la salud no exige origen: tiene que poder consultarse desde fuera", async () => {
    const r = await manejar(
      peticion({ ruta: "/api/salud", metodo: "GET", origen: undefined }),
      ctx
    );
    expect(r.estado).toBe(200);
    expect(r.json).toMatchObject({ ok: true, fragmentos: indice.fragmentos.length });
  });

  it("rechaza un origen que no esta en la lista", async () => {
    const r = await manejar(peticion({ origen: "https://sitio-ajeno.com" }), ctx);
    expect(r.estado).toBe(403);
  });

  it("la sesion se pide por POST, no por GET", async () => {
    // El navegador no manda cabecera Origin en un GET del mismo origen, y la
    // guarda de origen rechazaba la peticion del propio widget.
    expect((await manejar(peticion({ ruta: "/api/sesion", metodo: "GET" }), ctx)).estado).toBe(405);
    const r = await manejar(peticion({ ruta: "/api/sesion", metodo: "POST" }), ctx);
    expect(r.estado).toBe(200);
    expect((r.json as { sesion: string }).sesion).toBeTruthy();
  });

  it("el chat exige sesion valida", async () => {
    const r = await manejar(peticion({ cuerpo: { mensaje: "hola" } }), ctx);
    expect(r.estado).toBe(401);
  });

  it("atiende con sesion valida y devuelve un flujo", async () => {
    const r = await manejar(
      peticion({ sesion: sesion(), cuerpo: { mensaje: "cual es la capital de Francia" } }),
      ctx
    );
    expect(r.estado).toBe(200);
    expect(r.eventos).toBeDefined();
  });

  it("sin llave del modelo sigue respondiendo lo que puede", async () => {
    // Degrada, no se rompe: mismo criterio que el formulario de contacto
    // cuando falta la clave del proveedor de correo.
    const sinLlave = { indice, entorno: { ...entorno, llaveModelo: undefined } };
    const r = await manejar(
      peticion({ sesion: sesion(), cuerpo: { mensaje: "como cobran?" } }),
      sinLlave
    );
    expect(r.estado).toBe(200);
    const textos: string[] = [];
    for await (const ev of r.eventos ?? []) if (ev.tipo === "texto") textos.push(ev.texto);
    expect(textos.join("")).toContain("porcentaje por transacción");
  });

  it("al agotar el cupo deriva en vez de dar un error seco", async () => {
    const token = sesion();
    for (let i = 0; i < 9; i++) {
      await manejar(peticion({ sesion: token, cuerpo: { mensaje: "hola" } }), {
        indice,
        entorno: { ...entorno, llaveModelo: undefined }
      });
      // El cupo se anota al consumir el flujo; aqui se fuerza a mano.
      const { anotarUso } = await import("../guardas/cupos.js");
      anotarUso(`${token.split(".")[1]}|1.2.3.4`, 10);
    }
    const r = await manejar(peticion({ sesion: token, cuerpo: { mensaje: "hola" } }), ctx);
    expect(r.estado).toBe(429);
    expect((r.json as { respuesta: string }).respuesta).toContain("contacto@evetev.com");
  });
});
