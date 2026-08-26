"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { anuncia } from "@/app/carrito-eventos";
import { IconoCarrito } from "@/app/icono-carrito";
import { anadir } from "@/lib/acciones-carrito";

/* Añadir al carrito, en las dos formas que hacen falta.
 *
 * `completo` es el botón de la ficha; `compacto` es el icono sobre la foto en
 * la rejilla, para echar algo al carrito sin abrir el producto.
 *
 * **El formulario sigue siendo un formulario.** La tentación era interceptar el
 * envío para poder lanzar el aviso, y eso habría roto el carrito sin
 * JavaScript: con `action={fnDeCliente}` React ya no puede pintar el respaldo
 * que envía el formulario a pelo. Manteniendo `action={anadir}` —la acción de
 * servidor— React emite un `<form>` de verdad, y el aviso se engancha desde
 * dentro con `useFormStatus`, que es un observador y no un sustituto.
 */
export function BotonAnadir({
  slug,
  nombre,
  hay,
  compacto = false
}: {
  slug: string;
  nombre: string;
  hay: boolean;
  compacto?: boolean;
}) {
  return (
    <form action={anadir}>
      <input type="hidden" name="slug" value={slug} />
      <Enviar nombre={nombre} hay={hay} compacto={compacto} />
    </form>
  );
}

function Enviar({ nombre, hay, compacto }: { nombre: string; hay: boolean; compacto: boolean }) {
  /* `useFormStatus` sólo ve el formulario si se lee desde dentro, y por eso
     esto es un componente aparte y no dos líneas más arriba. */
  const { pending } = useFormStatus();
  const estaba = useRef(false);

  useEffect(() => {
    // El anuncio va en el flanco de bajada: cuando deja de estar pendiente es
    // cuando la acción terminó y la cookie ya viene puesta en la respuesta.
    if (estaba.current && !pending) anuncia(nombre);
    estaba.current = pending;
  }, [pending, nombre]);

  if (compacto) {
    return (
      <button
        disabled={!hay || pending}
        aria-label={hay ? `Añadir ${nombre} al carrito` : `${nombre}: sin existencias`}
        title={hay ? "Añadir al carrito" : "Sin existencias"}
        className="grid size-11 place-items-center rounded-full border border-linea bg-white text-noche shadow-sm transition hover:bg-coral hover:text-white disabled:cursor-not-allowed disabled:text-linea disabled:hover:bg-white"
      >
        <IconoCarrito className={pending ? "size-5 animate-pulse" : "size-5"} />
      </button>
    );
  }

  return (
    <button
      disabled={!hay || pending}
      className="mt-6 w-full rounded-xl bg-coral px-6 py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-linea disabled:text-pizarra"
    >
      {!hay ? "Sin existencias" : pending ? "Añadiendo…" : "Añadir al carrito"}
    </button>
  );
}
