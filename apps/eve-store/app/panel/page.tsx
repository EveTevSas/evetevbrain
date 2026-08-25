/* Pantalla de inicio del panel: la cola de avisos.
 *
 * No es «agregar producto» a propósito. El catálogo ya está importado; lo que
 * no está es revisado. Con los 25 productos bloqueados al importar, lo que desbloquea la
 * apertura de la tienda es resolver avisos, no dar de alta más productos.
 *
 * Todo se renderiza en el servidor. En el panel no es por los agentes —esta
 * página no se indexa— sino porque leer de Postgres desde el servidor evita
 * exponer la base al navegador y ahorra el viaje de hidratación.
 */
import { sql } from "drizzle-orm";

import { db } from "@/db/connection";

export const dynamic = "force-dynamic";

const pesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0
});

type Fila = {
  slug: string;
  nombre: string;
  marca: string;
  contenido: string | null;
  precio_minor: number;
  existencias: number;
  publicado: boolean;
  descripcion_por_confirmar: boolean;
  pendientes: number;
  avisos: string[];
};

export default async function Panel() {
  const base = db();

  const [resumen] = await base.execute<{
    productos: number;
    publicados: number;
    bloqueados: number;
    avisos: number;
    inventario: number;
    unidades: number;
    por_cobrar: number;
  }>(sql`
    select
      (select count(*)::int from tienda.producto)                                      as productos,
      (select count(*)::int from tienda.producto where publicado)                      as publicados,
      (select count(distinct producto_slug)::int from tienda.aviso
        where resuelto_en is null and bloqueante)                                      as bloqueados,
      (select count(*)::int from tienda.aviso where resuelto_en is null)               as avisos,
      (select coalesce(sum(precio_minor * existencias), 0)::bigint from tienda.producto) as inventario,
      (select coalesce(sum(existencias), 0)::int from tienda.producto)                 as unidades,
      (select count(*)::int from tienda.pedido where estado = 'pendiente_de_pago')     as por_cobrar`);

  const filas = await base.execute<Fila>(sql`
    select p.slug, p.nombre, p.marca, p.contenido, p.precio_minor::int as precio_minor,
           p.existencias, p.publicado, p.descripcion_por_confirmar,
           count(a.id) filter (where a.resuelto_en is null)::int as pendientes,
           coalesce(array_agg(a.texto) filter (where a.resuelto_en is null), '{}') as avisos
      from tienda.producto p
      left join tienda.aviso a on a.producto_slug = p.slug
     group by p.slug
     order by count(a.id) filter (where a.resuelto_en is null) desc, p.marca, p.nombre`);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-linea pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-pizarra">
            Eve-Store · Panel
          </p>
          <h1 className="font-display text-3xl font-bold">Qué falta para abrir</h1>
        </div>
        <a
          href="/panel/nuevo"
          className="rounded-lg border border-linea bg-white px-4 py-2 text-sm font-semibold hover:bg-hielo"
        >
          Nuevo producto
        </a>
        <p className="max-w-md text-sm text-pizarra">
          El catálogo ya está importado. Lo que falta es revisarlo: ningún producto sale a la tienda
          con avisos bloqueantes sin resolver.
        </p>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Dato n={resumen.productos} etiqueta="productos" />
        <Dato
          n={resumen.publicados}
          etiqueta="publicados"
          tono={resumen.publicados ? "" : "alerta"}
        />
        <Dato n={resumen.bloqueados} etiqueta="bloqueados" tono="alerta" />
        <Dato n={resumen.avisos} etiqueta="avisos pendientes" tono="alerta" />
        <Dato n={resumen.unidades} etiqueta="unidades en bodega" />
        <Dato texto={pesos.format(resumen.inventario)} etiqueta="valor del inventario" />
      </section>

      <h2 className="mt-12 font-display text-xl font-bold">
        Cola de trabajo · {filas.filter((f) => f.pendientes > 0).length} productos por revisar
      </h2>

      <ul className="mt-4 flex flex-col gap-3">
        {filas.map((f) => (
          <li
            key={f.slug}
            className="rounded-xl border border-linea bg-white p-5 shadow-[0_1px_2px_rgba(10,37,64,.05)]"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-semibold">
                <a href={`/panel/producto/${f.slug}`} className="hover:underline">
                  {f.nombre}
                  {f.contenido ? (
                    <span className="font-normal text-pizarra"> · {f.contenido}</span>
                  ) : (
                    <span className="ml-2 rounded bg-[#fdf3e3] px-1.5 py-0.5 text-xs font-medium text-alerta">
                      sin contenido
                    </span>
                  )}
                </a>
              </h3>
              <p className="text-sm tabular-nums text-pizarra">
                {f.marca} · {pesos.format(f.precio_minor)} · {f.existencias} en bodega
              </p>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {f.publicado ? (
                <Chip tono="exito">publicado</Chip>
              ) : (
                <Chip tono="alerta">
                  {f.pendientes} aviso{f.pendientes === 1 ? "" : "s"} por resolver
                </Chip>
              )}
              {f.descripcion_por_confirmar && <Chip>descripción por confirmar</Chip>}
            </div>

            {f.avisos.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5 border-l-2 border-linea pl-4">
                {f.avisos.map((a, i) => (
                  <li key={i} className="text-sm leading-relaxed text-pizarra">
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

function Dato({
  n,
  texto,
  etiqueta,
  tono = ""
}: {
  n?: number;
  texto?: string;
  etiqueta: string;
  tono?: string;
}) {
  return (
    <div className="rounded-xl border border-linea bg-white px-4 py-3">
      <p
        className={`font-display text-2xl font-bold tabular-nums ${
          tono === "alerta" ? "text-alerta" : ""
        }`}
      >
        {texto ?? n}
      </p>
      <p className="mt-0.5 text-xs leading-tight text-pizarra">{etiqueta}</p>
    </div>
  );
}

function Chip({ children, tono = "" }: { children: React.ReactNode; tono?: string }) {
  const color =
    tono === "exito"
      ? "bg-[#e8f6ec] text-exito"
      : tono === "alerta"
        ? "bg-[#fdf3e3] text-alerta"
        : "bg-hielo text-pizarra";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{children}</span>
  );
}
