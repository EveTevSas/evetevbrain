/* Alta de producto.
 *
 * Deliberadamente NO valida la calidad del dato. Un producto se puede crear con
 * lo mínimo para existir —nombre, marca y precio— y nace bloqueado con los
 * avisos que la base deduce: sin GTIN, sin contenido, sin imagen, descripción
 * corta o sin confirmar. Esos avisos no se «resuelven»: desaparecen cuando el
 * dato se arregla.
 *
 * El motivo de hacerlo así es que hay más de una puerta de entrada —esta y el
 * importador, y pronto la API de Mercado Libre— y si cada una decidiera por su
 * cuenta qué es un producto completo, el listón dependería de por dónde entró.
 * Un formulario que exige de todo tampoco sirve: obliga a inventarse un GTIN
 * para poder guardar, y un GTIN inventado es peor que ninguno.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";

import { db } from "@/db/connection";
import { producto } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Misma regla que `normalizar.py`: marca, nombre y contenido, sin tildes. */
function babosa(texto: string) {
  const sinTildes = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return sinTildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function crear(datos: FormData) {
  "use server";
  const nombre = String(datos.get("nombre") ?? "").trim();
  const marca = String(datos.get("marca") ?? "").trim();
  const precio = Number(datos.get("precio"));
  const contenido = String(datos.get("contenido") ?? "").trim();
  const gtin = String(datos.get("gtin") ?? "").trim();
  const imagen = String(datos.get("imagen") ?? "").trim();
  const descripcion = String(datos.get("descripcion") ?? "").trim();
  const existencias = Number(datos.get("existencias") ?? 0);

  if (!nombre || !marca || !Number.isInteger(precio) || precio <= 0) {
    redirect("/nuevo?error=faltan");
  }

  const base = babosa(`${marca}-${nombre}-${contenido}`);
  let slug = base;
  // Dos presentaciones del mismo producto sin contenido declarado chocarían en
  // la misma URL. Antes de inventar un sufijo se avisa: casi siempre significa
  // que falta el contenido, no que haga falta un `-2`.
  const [choque] = await db()
    .select({ slug: producto.slug })
    .from(producto)
    .where(sql`slug = ${slug}`);
  if (choque) {
    if (!contenido) redirect("/nuevo?error=choque");
    slug = `${base}-2`;
  }

  await db()
    .insert(producto)
    .values({
      slug,
      nombre,
      marca,
      precioMinor: precio,
      existencias: Number.isInteger(existencias) && existencias >= 0 ? existencias : 0,
      contenido: contenido || null,
      gtin: gtin || null,
      imagen: imagen || null,
      descripcion: descripcion || null,
      descripcionPorConfirmar: true
    });

  revalidatePath("/");
  redirect(`/producto/${slug}`);
}

export default async function Nuevo({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <a href="/" className="text-sm text-pizarra hover:underline">
        ← Cola de trabajo
      </a>

      <h1 className="mt-4 font-display text-3xl font-bold">Nuevo producto</h1>
      <p className="mt-2 text-sm text-pizarra">
        Con el nombre, la marca y el precio basta para crearlo. Nacerá bloqueado y la ficha dirá
        exactamente qué le falta para poder publicarse.
      </p>

      {error === "faltan" && (
        <p className="mt-4 rounded-lg bg-[#fdeaea] px-4 py-3 text-sm text-[#b91c1c]">
          Faltan el nombre, la marca o un precio mayor que cero.
        </p>
      )}
      {error === "choque" && (
        <p className="mt-4 rounded-lg bg-[#fdf3e3] px-4 py-3 text-sm text-alerta">
          Ya existe un producto con esa marca y ese nombre. Si es otra presentación, escribe el
          contenido —«250 ml»— y dejarán de chocar.
        </p>
      )}

      <form action={crear} className="mt-8 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Nombre" requerido>
            <input name="nombre" required className={entrada} />
          </Campo>
          <Campo etiqueta="Marca" requerido>
            <input name="marca" required className={entrada} />
          </Campo>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Campo etiqueta="Precio" requerido nota="Pesos enteros, sin puntos.">
            <input name="precio" type="number" min={1} step={1} required className={entrada} />
          </Campo>
          <Campo etiqueta="Existencias">
            <input
              name="existencias"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              className={entrada}
            />
          </Campo>
          <Campo etiqueta="Contenido" nota="250 ml, 120 g…">
            <input name="contenido" className={entrada} />
          </Campo>
        </div>

        <Campo
          etiqueta="GTIN"
          nota="El código de barras. Si no lo tienes a mano, déjalo vacío: es preferible a inventarlo."
        >
          <input name="gtin" inputMode="numeric" className={entrada} />
        </Campo>

        <Campo etiqueta="Imagen (URL)">
          <input name="imagen" type="url" className={entrada} />
        </Campo>

        <Campo etiqueta="Descripción" nota="Desde 150 caracteres compite en los canales de compra.">
          <textarea name="descripcion" rows={6} className={`${entrada} leading-relaxed`} />
        </Campo>

        <button className="self-start rounded-lg bg-noche px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          Crear producto
        </button>
      </form>
    </main>
  );
}

const entrada = "w-full rounded-lg border border-linea bg-white px-3 py-2";

function Campo({
  etiqueta,
  nota,
  requerido,
  children
}: {
  etiqueta: string;
  nota?: string;
  requerido?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {etiqueta}
        {requerido && <span className="ml-1 text-coral">*</span>}
      </span>
      {children}
      {nota && <span className="text-xs text-pizarra">{nota}</span>}
    </label>
  );
}
