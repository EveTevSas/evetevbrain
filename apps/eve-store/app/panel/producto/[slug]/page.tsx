/* Ficha de producto en el panel: revisar, corregir y publicar.
 *
 * Las acciones son de servidor. No es preferencia de estilo: significa que
 * ninguna escritura depende de que el navegador ejecute nada, y que la
 * validación vive donde vive el dato. El disparador de Postgres sigue siendo la
 * última palabra sobre publicar — esta pantalla se limita a explicar por qué
 * dice que no.
 */
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db/connection";
import { aviso, producto } from "@/db/schema";

export const dynamic = "force-dynamic";

const pesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

async function resolverAviso(datos: FormData) {
  "use server";
  const id = Number(datos.get("id"));
  const slug = String(datos.get("slug"));
  await db()
    .update(aviso)
    .set({ resueltoEn: new Date(), resueltoPor: "panel" })
    .where(eq(aviso.id, id));
  revalidatePath(`/panel/producto/${slug}`);
  revalidatePath("/panel");
}

async function guardar(datos: FormData) {
  "use server";
  const slug = String(datos.get("slug"));
  const precio = Number(datos.get("precio"));
  const existencias = Number(datos.get("existencias"));
  const contenido = String(datos.get("contenido") ?? "").trim();
  const descripcion = String(datos.get("descripcion") ?? "").trim();
  const gtin = String(datos.get("gtin") ?? "").trim();
  const imagen = String(datos.get("imagen") ?? "").trim();

  // Se valida aquí y la base vuelve a validar con sus `check`. Dos capas a
  // propósito: esta da un mensaje útil, la otra hace la regla infranqueable.
  if (!Number.isInteger(precio) || precio <= 0) return;
  if (!Number.isInteger(existencias) || existencias < 0) return;

  await db()
    .update(producto)
    .set({
      precioMinor: precio,
      existencias,
      contenido: contenido || null,
      descripcion: descripcion || null,
      gtin: gtin || null,
      imagen: imagen || null,
      descripcionPorConfirmar: datos.get("confirmada") !== "on"
    })
    .where(eq(producto.slug, slug));
  revalidatePath(`/panel/producto/${slug}`);
  revalidatePath("/panel");
}

async function publicar(datos: FormData) {
  "use server";
  const slug = String(datos.get("slug"));
  const quiere = datos.get("publicar") === "si";
  try {
    await db().update(producto).set({ publicado: quiere }).where(eq(producto.slug, slug));
  } catch (e) {
    /* Antes esto se tragaba el error en silencio, con el razonamiento de que la
     * pantalla ya mostraba los avisos pendientes. Falla en el caso que importa:
     * si el rechazo es por otra cosa —la base saturada, por ejemplo— quien
     * pulsa el botón no ve absolutamente nada y cree que publicó. Ya pasó. */
    const motivo =
      e instanceof Error && e.message.includes("aviso(s) bloqueante(s)") ? "avisos" : "error";
    redirect(`/panel/producto/${slug}?fallo=${motivo}`);
  }
  revalidatePath(`/panel/producto/${slug}`);
  revalidatePath("/panel");
  revalidatePath("/");
}

export default async function Ficha({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fallo?: string }>;
}) {
  const { slug } = await params;
  const { fallo } = await searchParams;
  const base = db();

  const [p] = await base.select().from(producto).where(eq(producto.slug, slug));
  if (!p) notFound();

  const avisos = await base
    .select()
    .from(aviso)
    .where(eq(aviso.productoSlug, slug))
    .orderBy(sql`resuelto_en is not null, id`);

  const pendientes = avisos.filter((a) => !a.resueltoEn);

  /* Los GTIN entre los que elegir. Ya estaban en la base —el importador guarda
   * el vigente y el histórico— pero no había dónde escogerlos: el aviso pedía
   * decidir cuál y el formulario no tenía campo. Un aviso que pide una decisión
   * que la pantalla no puede registrar solo se puede cerrar mintiendo. */
  const candidatos = [
    ...new Set([p.gtin, ...(p.gtinHistoricos ?? [])].filter(Boolean))
  ] as string[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <a href="/panel" className="text-sm text-pizarra hover:underline">
        ← Cola de trabajo
      </a>

      <header className="mt-4 border-b border-linea pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">{p.marca}</p>
        <h1 className="font-display text-3xl font-bold">{p.nombre}</h1>
        <p className="mt-2 text-sm text-pizarra">
          {pesos.format(p.precioMinor)} · {p.existencias} en bodega · GTIN {p.gtin ?? "sin asignar"}
        </p>
      </header>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">
          {pendientes.length > 0
            ? `${pendientes.length} aviso${pendientes.length === 1 ? "" : "s"} por resolver`
            : "Sin avisos pendientes"}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {avisos.map((a) => (
            <li
              key={a.id}
              className={`flex items-start gap-3 rounded-lg border border-linea bg-white p-3 text-sm ${
                a.resueltoEn ? "opacity-50" : ""
              }`}
            >
              <span className="flex-1 leading-relaxed">{a.texto}</span>
              {a.resueltoEn ? (
                <span className="shrink-0 text-xs text-exito">resuelto</span>
              ) : a.origen === "automatico" ? (
                /* Los avisos automáticos no se resuelven a mano: se retiran
                   cuando el dato se arregla. Ofrecer un botón aquí sería
                   ofrecer una forma de publicar un producto sin GTIN. */
                <span className="shrink-0 text-xs text-pizarra">se retira al corregir el dato</span>
              ) : (
                <form action={resolverAviso} className="shrink-0">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button className="rounded-md border border-linea px-2.5 py-1 text-xs font-medium hover:bg-hielo">
                    Resolver
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form action={guardar} className="mt-10 flex flex-col gap-5">
        <input type="hidden" name="slug" value={slug} />
        <h2 className="font-display text-xl font-bold">Detalles</h2>

        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Precio (pesos enteros)" nota="Se guarda como entero, igual que EvePay.">
            <input
              name="precio"
              type="number"
              min={1}
              step={1}
              defaultValue={p.precioMinor}
              className="w-full rounded-lg border border-linea bg-white px-3 py-2 tabular-nums"
            />
          </Campo>
          <Campo etiqueta="Existencias">
            <input
              name="existencias"
              type="number"
              min={0}
              step={1}
              defaultValue={p.existencias}
              className="w-full rounded-lg border border-linea bg-white px-3 py-2 tabular-nums"
            />
          </Campo>
        </div>

        <Campo
          etiqueta="Contenido"
          nota="En cosmética es lo que permite comparar precio entre presentaciones."
        >
          <input
            name="contenido"
            defaultValue={p.contenido ?? ""}
            placeholder="250 ml"
            className="w-full rounded-lg border border-linea bg-white px-3 py-2"
          />
        </Campo>

        <Campo
          etiqueta="Código de barras (GTIN)"
          nota={
            candidatos.length > 1
              ? "El origen trajo más de uno. Elige el del envase que tienes en la mano: es lo que permite que un agente cruce este producto con el mismo producto en otro sitio."
              : "Si no lo tienes a mano, déjalo vacío. Un GTIN inventado es peor que ninguno, porque cruza este producto con otro distinto."
          }
        >
          {candidatos.length > 1 ? (
            <div className="flex flex-col gap-2">
              {candidatos.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="gtin" value={c} defaultChecked={c === p.gtin} />
                  <span className="tabular-nums">{c}</span>
                  {c === p.gtin && <span className="text-xs text-pizarra">(el actual)</span>}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="gtin" value="" defaultChecked={!p.gtin} />
                <span className="text-pizarra">ninguno de los dos</span>
              </label>
            </div>
          ) : (
            <input
              name="gtin"
              inputMode="numeric"
              defaultValue={p.gtin ?? ""}
              className="w-full rounded-lg border border-linea bg-white px-3 py-2 tabular-nums"
            />
          )}
        </Campo>

        <Campo etiqueta="Imagen (URL)" nota="Los canales de compra exigen al menos una.">
          <input
            name="imagen"
            type="url"
            defaultValue={p.imagen ?? ""}
            className="w-full rounded-lg border border-linea bg-white px-3 py-2"
          />
        </Campo>

        <Campo etiqueta="Descripción" nota="Mínimo 150 caracteres para competir en los canales.">
          <textarea
            name="descripcion"
            rows={6}
            defaultValue={p.descripcion ?? ""}
            className="w-full rounded-lg border border-linea bg-white px-3 py-2 leading-relaxed"
          />
        </Campo>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="confirmada"
            defaultChecked={!p.descripcionPorConfirmar}
            className="size-4"
          />
          La descripción está revisada y aprobada
        </label>

        <button className="self-start rounded-lg bg-noche px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Guardar
        </button>
      </form>

      <section className="mt-10 rounded-xl border border-linea bg-white p-5">
        <h2 className="font-display text-lg font-bold">Publicación</h2>
        {fallo && (
          <p className="mt-2 rounded-lg bg-[#fdeaea] px-3 py-2 text-sm text-[#b91c1c]">
            {fallo === "avisos"
              ? "La base rechazó la publicación: quedan avisos bloqueantes sin resolver."
              : "No se pudo publicar. Vuelve a intentarlo; si sigue fallando, revisa los registros."}
          </p>
        )}
        {p.publicado ? (
          <p className="mt-1 text-sm text-exito">Este producto está publicado en la tienda.</p>
        ) : pendientes.length > 0 ? (
          <p className="mt-1 text-sm text-alerta">
            No se puede publicar: {pendientes.length} aviso
            {pendientes.length === 1 ? "" : "s"} bloqueante
            {pendientes.length === 1 ? "" : "s"} sin resolver. La regla la aplica la base de datos,
            no esta pantalla.
          </p>
        ) : (
          <p className="mt-1 text-sm text-pizarra">Listo para publicar.</p>
        )}
        <form action={publicar} className="mt-3">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="publicar" value={p.publicado ? "no" : "si"} />
          <button
            disabled={!p.publicado && pendientes.length > 0}
            className="rounded-lg border border-linea px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {p.publicado ? "Retirar de la tienda" : "Publicar"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Campo({
  etiqueta,
  nota,
  children
}: {
  etiqueta: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{etiqueta}</span>
      {children}
      {nota && <span className="text-xs text-pizarra">{nota}</span>}
    </label>
  );
}
