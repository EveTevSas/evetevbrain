/** El motor generador, detras de una interfaz.
 *
 *  Cambiar de proveedor tiene que ser cambiar un archivo. No es purismo: el
 *  nivel de modelo se elige **midiendo**, y medir exige poder intercambiarlos. */
export interface PeticionModelo {
  /** Estable entre peticiones: es lo que el cache de contexto abarata. */
  sistema: string;
  usuario: string;
  /** Opcional a proposito: **no todos los modelos la admiten**. `kimi-k2.6`
   *  responde 400 con «only 1 is allowed for this model». Cuando va sin
   *  definir, no se envia y decide el proveedor.
   *
   *  Que esto no duela es una consecuencia del diseno, no una casualidad: el
   *  anclaje no depende de la temperatura, depende de la compuerta —que decide
   *  si se llama al modelo— y de la verificacion de citas y cifras, que vive en
   *  codigo. Un parametro de muestreo nunca fue la guarda. */
  temperatura?: number;
  topeTokens: number;
}

export interface Uso {
  tokensEntrada: number;
  tokensSalida: number;
  tokensCacheados: number;
  milisegundos: number;
}

export interface RespuestaModelo {
  texto: string;
  uso: Uso;
}

export interface Motor {
  readonly nombre: string;
  generar(peticion: PeticionModelo): Promise<RespuestaModelo>;
  /** Emite el texto por trozos. `generar` es esto mismo, acumulado. */
  generarEnTrozos(peticion: PeticionModelo): AsyncGenerator<string, Uso, undefined>;
}
