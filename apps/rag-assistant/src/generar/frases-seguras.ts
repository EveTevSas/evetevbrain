/** Corta un flujo de texto en frases **completas**, sin soltar una frase hasta
 *  estar seguro de que ya no le sigue nada pegado.
 *
 *  Existe por un problema que aparece al montar el streaming y que el plan no
 *  contemplaba: **lo que ya se mostro no se puede desdecir**. Si se transmite
 *  token a token y la verificacion falla al final, la respuesta mala ya la vio
 *  la persona.
 *
 *  La salida es transmitir **por frases ya verificadas**: se acumula, y en
 *  cuanto hay una frase entera se comprueba y recien entonces se emite. Nada
 *  sin verificar llega nunca a la pantalla, y el primer texto visible aparece
 *  al cabo de una frase y no de la respuesta entera.
 *
 *  El detalle que lo hace correcto: **las citas van despues del punto**
 *  —«…que ya existia. [#evepay-capacidades#1]»—, asi que una frase no esta
 *  cerrada en el punto, sino despues del grupo de citas que la sigue. */

const FIN_DE_FRASE = /[.!?](?=\s|$)/g;
const CITAS_PEGADAS = /^\s*(?:\[#[^\]]*\]\s*)*/;

export interface Corte {
  /** Frases completas y seguras de emitir. */
  listas: string[];
  /** Lo que queda por acumular. */
  resto: string;
}

export function cortarFrases(acumulado: string, finalizado: boolean): Corte {
  const listas: string[] = [];
  let resto = acumulado;

  for (;;) {
    const corte = siguienteCorte(resto, finalizado);
    if (corte === undefined) break;
    const frase = resto.slice(0, corte).trim();
    if (frase) listas.push(frase);
    resto = resto.slice(corte);
  }

  if (finalizado && resto.trim()) {
    listas.push(resto.trim());
    resto = "";
  }

  return { listas, resto };
}

function siguienteCorte(texto: string, finalizado: boolean): number | undefined {
  FIN_DE_FRASE.lastIndex = 0;
  let encontrado: RegExpExecArray | null;
  while ((encontrado = FIN_DE_FRASE.exec(texto)) !== null) {
    const trasPunto = encontrado.index + 1;
    const cola = texto.slice(trasPunto);
    const citas = CITAS_PEGADAS.exec(cola)?.[0] ?? "";
    const fin = trasPunto + citas.length;

    // Si el grupo de citas se come todo lo que queda, todavia puede llegar mas
    // —otra cita, o el cierre de una a medias—. Salvo que el flujo ya termino.
    if (fin >= texto.length && !finalizado) return undefined;
    // Una cita a medias («[#evepay-» sin cerrar) tampoco es un corte seguro.
    if (cola.includes("[") && !citas.includes("[")) return undefined;
    return fin;
  }
  return undefined;
}
