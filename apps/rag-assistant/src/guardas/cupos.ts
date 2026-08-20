/** Cupos por sesion y presupuesto diario de tokens.
 *
 *  **Vive en memoria del proceso, y eso tiene consecuencias que conviene decir
 *  en voz alta**: en Vercel hay varias instancias y son efimeras, asi que este
 *  contador no es una barrera dura — es un badén. Frena el guion ingenuo y el
 *  bucle accidental del navegador, no a alguien decidido.
 *
 *  El cupo duradero necesita almacen compartido (KV o Postgres) y entra junto
 *  con el registro de eventos, que es cuando aparece el almacen de todos modos.
 *  Montarlo antes seria infraestructura para un problema que todavia no
 *  tenemos. */

export interface LimitesCupo {
  porVentana: number;
  ventanaMs: number;
  porDia: number;
  tokensPorDia: number;
}

export const CUPOS: LimitesCupo = {
  porVentana: 8,
  ventanaMs: 10 * 60 * 1000,
  porDia: 30,
  tokensPorDia: 200_000
};

interface Contador {
  ventana: number[];
  dia: number[];
}

const porClave = new Map<string, Contador>();
let tokensHoy = 0;
let diaEnCurso = "";

export type Veredicto =
  { permitido: true } | { permitido: false; motivo: "cupo_ventana" | "cupo_dia" | "presupuesto" };

export function consultarCupo(clave: string, limites = CUPOS, ahora = Date.now()): Veredicto {
  reiniciarSiCambioElDia(ahora);
  if (tokensHoy >= limites.tokensPorDia) return { permitido: false, motivo: "presupuesto" };

  const contador = porClave.get(clave) ?? { ventana: [], dia: [] };
  contador.ventana = contador.ventana.filter((t) => ahora - t < limites.ventanaMs);
  contador.dia = contador.dia.filter((t) => ahora - t < 24 * 60 * 60 * 1000);
  porClave.set(clave, contador);

  if (contador.ventana.length >= limites.porVentana)
    return { permitido: false, motivo: "cupo_ventana" };
  if (contador.dia.length >= limites.porDia) return { permitido: false, motivo: "cupo_dia" };
  return { permitido: true };
}

export function anotarUso(clave: string, tokens: number, ahora = Date.now()): void {
  reiniciarSiCambioElDia(ahora);
  const contador = porClave.get(clave) ?? { ventana: [], dia: [] };
  contador.ventana.push(ahora);
  contador.dia.push(ahora);
  porClave.set(clave, contador);
  tokensHoy += tokens;
}

/** Solo para tests. */
export function reiniciarCupos(): void {
  porClave.clear();
  tokensHoy = 0;
  diaEnCurso = "";
}

function reiniciarSiCambioElDia(ahora: number): void {
  const hoy = new Date(ahora).toISOString().slice(0, 10);
  if (hoy !== diaEnCurso) {
    diaEnCurso = hoy;
    tokensHoy = 0;
  }
}
