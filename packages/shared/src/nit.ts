/**
 * Dígito de verificación del NIT (algoritmo de la DIAN).
 *
 * POR QUÉ SE VALIDA. El NIT es la llave con la que todo cuadra después: la
 * cuenta a la que se dispersa debe estar a su nombre, y la factura sale con
 * él. Un dígito cambiado no rebota en ningún lado hasta que el banco rechaza
 * una transferencia o la DIAN una factura, semanas más tarde y con la plata ya
 * movida. Comprobarlo al digitar cuesta una multiplicación.
 *
 * El cálculo: se toman los dígitos del número de derecha a izquierda, cada uno
 * se multiplica por su primo de la serie, y el residuo de la suma entre 11 da
 * el dígito (salvo 0 y 1, que son ellos mismos).
 */

/** Serie de primos de la DIAN, aplicada de derecha a izquierda. */
const PRIMOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/**
 * Calcula el dígito de verificación de un NIT, o null si el número no es
 * utilizable (vacío, con letras, o más largo que la serie de primos).
 */
export function digitoVerificacionNit(numero: string): number | null {
  const digitos = numero.replace(/[.\s-]/g, "");
  if (!/^\d+$/.test(digitos) || digitos.length > PRIMOS.length) {
    return null;
  }

  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    // De derecha a izquierda: el último dígito lleva el primer primo.
    const digito = Number(digitos[digitos.length - 1 - i]);
    suma += digito * PRIMOS[i]!;
  }

  const residuo = suma % 11;
  return residuo < 2 ? residuo : 11 - residuo;
}

/**
 * true si el dígito de verificación corresponde al número.
 *
 * Un DV vacío se acepta: no todos los documentos lo llevan (una cédula no
 * tiene) y forzarlo obligaría a inventarse uno, que es peor que no tenerlo.
 */
export function nitCoincideConDv(numero: string, dv: string | null | undefined): boolean {
  const declarado = (dv ?? "").trim();
  if (declarado === "") return true;

  const calculado = digitoVerificacionNit(numero);
  return calculado !== null && String(calculado) === declarado;
}
