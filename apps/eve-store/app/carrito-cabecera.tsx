"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { escucha } from "@/app/carrito-eventos";
import { IconoCarrito } from "@/app/icono-carrito";

/* El carrito de la cabecera: icono, cuántas unidades, y un salto al añadir.
 *
 * Es lo único de la cabecera que se ejecuta en el navegador, y por una razón
 * concreta: leer la cookie desde el servidor volvería dinámicas la portada y
 * las fichas, que se sirven con ISR. Cambiar esa caché por una cifra sería un
 * mal trato, así que la cifra se pinta aquí y el resto de la tienda sigue
 * siendo HTML servido. El enlace, en cambio, va siempre en el HTML: sin
 * JavaScript se llega igual al carrito, sólo que sin número.
 *
 * El salto no es decoración. Al quitar el redirigir-al-carrito, esta es —junto
 * al aviso— la única confirmación de que el producto entró; sin ella, pulsar
 * el icono de una tarjeta no produce ningún cambio visible y parece roto. Se
 * relanza cambiando la `key`, que es la forma de rearrancar una animación CSS
 * cuando el mismo elemento se anima dos veces seguidas.
 */
export function CarritoCabecera() {
  const ruta = usePathname();
  const [unidades, setUnidades] = useState(0);
  const [pulsos, setPulsos] = useState(0);

  useEffect(() => {
    const leer = () => {
      const m = document.cookie.match(/(?:^|; )carrito_n=(\d+)/);
      setUnidades(m ? Number(m[1]) : 0);
    };
    leer();

    // Tres momentos en que el número puede haber cambiado: al cargar, al
    // cambiar de página, y al añadir algo desde cualquier parte de la tienda.
    const dejarDeEscuchar = escucha(() => {
      leer();
      setPulsos((n) => n + 1);
    });
    // Al volver atrás, el navegador puede servir la página de su caché sin
    // re-ejecutar el efecto. `pageshow` cubre ese caso.
    window.addEventListener("pageshow", leer);
    return () => {
      dejarDeEscuchar();
      window.removeEventListener("pageshow", leer);
    };
  }, [ruta]);

  return (
    <a
      href="/carrito"
      aria-label={unidades > 0 ? `Carrito, ${unidades} unidades` : "Carrito, vacío"}
      className="relative grid size-10 shrink-0 place-items-center rounded-lg border border-linea text-noche hover:bg-hielo"
    >
      <span key={pulsos} className={pulsos > 0 ? "salta" : undefined}>
        <IconoCarrito />
      </span>
      {unidades > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-xs font-semibold tabular-nums text-white">
          {unidades}
        </span>
      )}
    </a>
  );
}
