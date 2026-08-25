"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/* El número que va junto a «Carrito».
 *
 * Es lo único de la cabecera que se ejecuta en el navegador, y por una razón
 * concreta: leer la cookie desde el servidor volvería dinámicas la portada y
 * las fichas, que se sirven con ISR. Cambiar esa caché por una cifra sería un
 * mal trato, así que la cifra se pinta aquí y el resto de la tienda sigue
 * siendo HTML servido.
 *
 * El primer intento fue un `<script>` dentro del componente de servidor, y no
 * funcionaba: React avisa —«scripts inside React components are never executed
 * when rendering on the client»— y en efecto, al llegar al carrito por una
 * acción de servidor la navegación es de cliente y el script nunca corría. El
 * contador se quedaba en blanco justo después de añadir algo, que es el único
 * momento en que a alguien le importa.
 *
 * Depende de `pathname` porque al cambiar de página el efecto tiene que volver
 * a leer: si no, el número se queda con el valor de la pantalla anterior.
 */
export function CuentaCarrito() {
  const ruta = usePathname();
  const [unidades, setUnidades] = useState(0);

  useEffect(() => {
    const leer = () => {
      const m = document.cookie.match(/(?:^|; )carrito_n=(\d+)/);
      setUnidades(m ? Number(m[1]) : 0);
    };
    leer();
    // Al volver atrás, el navegador puede servir la página de su caché sin
    // re-ejecutar el efecto. `pageshow` cubre ese caso.
    window.addEventListener("pageshow", leer);
    return () => window.removeEventListener("pageshow", leer);
  }, [ruta]);

  if (unidades < 1) return null;
  return <span className="tabular-nums"> · {unidades}</span>;
}
