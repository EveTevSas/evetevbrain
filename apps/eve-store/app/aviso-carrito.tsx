"use client";

import { useEffect, useState } from "react";

import { escucha } from "@/app/carrito-eventos";

/* «Añadiste X al carrito», y se va solo.
 *
 * Con el salto al carrito eliminado, quien pulsa el icono de una tarjeta
 * necesita algo que le diga que funcionó. El contador de arriba lo dice, pero
 * está lejos del dedo y en móvil puede quedar fuera de la mirada; este aviso
 * aparece donde está pasando la acción y además nombra el producto, que es la
 * diferencia entre «algo se añadió» y «se añadió lo que yo quería».
 *
 * Lleva `role="status"` para que un lector de pantalla lo lea sin robar el
 * foco, y un enlace al carrito: quien ya terminó de comprar no debería tener
 * que ir a buscarlo arriba.
 *
 * Se va a los cuatro segundos. Si se añade otra cosa antes, el temporizador
 * se reinicia con el nombre nuevo en vez de acumular avisos: apilarlos tapa la
 * tienda justo cuando alguien está comprando rápido.
 */
export function AvisoCarrito() {
  const [aviso, setAviso] = useState<{ nombre: string; id: number } | null>(null);

  useEffect(() => escucha((nombre) => setAviso({ nombre, id: Date.now() })), []);

  useEffect(() => {
    if (!aviso) return;
    const reloj = setTimeout(() => setAviso(null), 4000);
    return () => clearTimeout(reloj);
  }, [aviso]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4"
    >
      {aviso && (
        <div
          key={aviso.id}
          className="aviso-entra pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-noche px-4 py-3 text-sm text-white shadow-lg"
        >
          <span className="truncate">
            Añadiste <strong className="font-semibold">{aviso.nombre}</strong>
          </span>
          <a href="/carrito" className="shrink-0 font-semibold underline underline-offset-2">
            Ver carrito
          </a>
        </div>
      )}
    </div>
  );
}
