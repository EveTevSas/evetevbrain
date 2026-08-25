import "server-only";

/* La frontera del cobro.
 *
 * Existe desde antes de que haya con qué cobrar, y ese es el punto. La
 * constitución nombra `PaymentProvider` como la costura que hace barato el
 * crecimiento, y John decidió que EvePay entra cuando la adquirencia esté
 * habilitada. Que la pasarela llegue después no permite dejar el pago para
 * después: obliga a lo contrario, porque cablear un proveedor y luego
 * abstraerlo es rehacer el checkout entero.
 *
 * **Y la tienda hablará con EvePay por HTTP, nunca importando su módulo**,
 * aunque vivan en el mismo repositorio. Es regla dura: si nuestra propia
 * vertical no consume la plataforma como un cliente externo, nunca sabremos si
 * la plataforma sirve para clientes externos.
 */

export type Cobro = {
  /** Entero en la unidad mínima, igual que `montoMinor` en EvePay. */
  montoMinor: number;
  moneda: string;
  /** El número del pedido. Viaja como referencia para poder conciliar. */
  referencia: string;
  correo: string;
};

export type Resultado =
  { tipo: "redirigir"; url: string; cobroId: string } | { tipo: "sin_pasarela" };

export interface ProveedorDePago {
  readonly nombre: string;
  iniciar(cobro: Cobro): Promise<Resultado>;
}

/**
 * El proveedor de hoy: ninguno.
 *
 * No es un simulacro ni un cobro de mentira. Devuelve `sin_pasarela` y el
 * checkout lo dice con todas las letras: el pedido queda registrado y alguien
 * se pone en contacto para cobrarlo. Fingir un pago que no ocurre sería la peor
 * opción de las tres — deja pedidos marcados como pagados que nadie cobró.
 */
class SinPasarela implements ProveedorDePago {
  readonly nombre = "ninguno";
  async iniciar(): Promise<Resultado> {
    return { tipo: "sin_pasarela" };
  }
}

/**
 * EvePay, cuando exista.
 *
 * Se deja escrito el hueco con su forma para que el día de la habilitación sea
 * cambiar una línea y no rediseñar nada. El `fetch` va contra la API de EvePay,
 * por HTTP, con la clave del comercio.
 */
class EvePay implements ProveedorDePago {
  readonly nombre = "evepay";
  constructor(private readonly base: string) {}

  async iniciar(_cobro: Cobro): Promise<Resultado> {
    throw new Error(
      `EvePay todavía no cobra: la habilitación con la adquirencia sigue en curso (${this.base}).`
    );
  }
}

/** El proveedor activo. Cambia solo cuando exista `EVEPAY_API_URL`. */
export function proveedor(): ProveedorDePago {
  const base = process.env.EVEPAY_API_URL;
  return base ? new EvePay(base) : new SinPasarela();
}
