"use client";

/* El aviso de «se añadió», entre componentes que no se conocen.
 *
 * El botón vive en la rejilla o en la ficha; el contador y el aviso viven en la
 * cabecera. No hay padre común donde colgar un estado —la cabecera se pinta en
 * el servidor y las tarjetas son otra rama del árbol— y montar un contexto que
 * envuelva la página entera obligaría a volver cliente todo lo que quede dentro.
 *
 * Un evento del navegador resuelve justo eso: quien añade lo anuncia, quien
 * quiera enterarse escucha. Cuesta cero kilobytes de librería y no arrastra
 * nada al cliente que no lo necesite.
 */
export const EVENTO = "carrito:anadido";

export function anuncia(nombre: string) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { nombre } }));
}

export function escucha(alOir: (nombre: string) => void) {
  const mango = (e: Event) => alOir((e as CustomEvent<{ nombre: string }>).detail.nombre);
  window.addEventListener(EVENTO, mango);
  return () => window.removeEventListener(EVENTO, mango);
}
