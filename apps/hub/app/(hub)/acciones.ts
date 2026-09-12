"use server";

import { EnlaceProductoSchema, EstadoCuentaSchema } from "@evetev/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sesionActual } from "@/lib/auth/sesion";
import { auditar } from "@/lib/hub/auditoria";
import { borrarEnlace, cambiarEstadoCuenta, cuentaPorNit, guardarEnlace } from "@/lib/hub/cuentas";
import {
  agregarLogro,
  borrarLogro,
  borrarMeta,
  guardarMeta,
  guardarMiembro
} from "@/lib/hub/equipo";
import { borrarCosto, guardarCierre, guardarCosto } from "@/lib/hub/finanzas";
import { borrarPortal, guardarPortal } from "@/lib/hub/portales";

/*
 * Server actions del Hub. Cada una: valida con Zod, escribe, audita (CA-7) y
 * revalida la ruta. Si algo falla, vuelve a la misma pantalla con ?error=.
 */

const t = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => Number(t(f, k).replace(/[^\d-]/g, "") || 0);

function fallar(ruta: string, error: unknown): never {
  const msg =
    error instanceof z.ZodError
      ? error.issues.map((i) => i.message).join(" · ")
      : error instanceof Error
        ? error.message
        : "No se pudo guardar.";
  redirect(`${ruta}?error=${encodeURIComponent(msg.slice(0, 200))}`);
}

async function actor(): Promise<string> {
  const { email } = await sesionActual();
  return email || "desconocido";
}

// --- Portales ---------------------------------------------------------------
const PortalSchema = z.object({
  id: z.string().uuid().nullable(),
  nombre: z.string().min(2, "Nombre muy corto").max(80),
  url: z.string().url("URL inválida"),
  descripcion: z.string().max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color en formato #RRGGBB"),
  estado: z.enum(["operando", "beta", "inactivo"]),
  rolAcceso: z.string().max(80),
  orden: z.number().int().min(0).max(1000)
});

export async function guardarPortalAccion(f: FormData) {
  try {
    const p = PortalSchema.parse({
      id: t(f, "id") || null,
      nombre: t(f, "nombre"),
      url: t(f, "url"),
      descripcion: t(f, "descripcion"),
      color: t(f, "color") || "#0A2540",
      estado: t(f, "estado") || "operando",
      rolAcceso: t(f, "rolAcceso"),
      orden: n(f, "orden") || 100
    });
    const id = await guardarPortal(p);
    await auditar({
      actor: await actor(),
      accion: p.id ? "portal.editar" : "portal.crear",
      entidad: "portal",
      entidadId: id,
      detalle: p
    });
  } catch (e) {
    fallar("/portales", e);
  }
  revalidatePath("/portales");
}

export async function borrarPortalAccion(f: FormData) {
  const id = z.string().uuid().parse(t(f, "id"));
  await borrarPortal(id);
  await auditar({
    actor: await actor(),
    accion: "portal.borrar",
    entidad: "portal",
    entidadId: id
  });
  revalidatePath("/portales");
}

// --- Equipo -----------------------------------------------------------------
export async function guardarMiembroAccion(f: FormData) {
  try {
    const m = z
      .object({
        id: z.string().uuid().nullable(),
        email: z.string().email("Correo inválido"),
        nombre: z.string().min(2),
        rol: z.string().min(2, "Di qué hace"),
        iniciales: z.string().min(1).max(3),
        activo: z.boolean()
      })
      .parse({
        id: t(f, "id") || null,
        email: t(f, "email"),
        nombre: t(f, "nombre"),
        rol: t(f, "rol"),
        iniciales:
          t(f, "iniciales") ||
          t(f, "nombre")
            .split(/\s+/)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? "")
            .join(""),
        activo: t(f, "activo") !== "no"
      });
    const id = await guardarMiembro(m);
    await auditar({
      actor: await actor(),
      accion: m.id ? "miembro.editar" : "miembro.crear",
      entidad: "miembro",
      entidadId: id,
      detalle: { email: m.email, rol: m.rol }
    });
  } catch (e) {
    fallar("/equipo", e);
  }
  revalidatePath("/equipo");
}

export async function guardarMetaAccion(f: FormData) {
  try {
    const x = z
      .object({
        id: z.string().uuid().nullable(),
        miembroId: z.string().uuid(),
        titulo: z.string().min(3, "Título muy corto"),
        avance: z.number().int().min(0).max(100),
        trimestre: z.string().regex(/^\d{4}-Q[1-4]$/)
      })
      .parse({
        id: t(f, "id") || null,
        miembroId: t(f, "miembroId"),
        titulo: t(f, "titulo"),
        avance: n(f, "avance"),
        trimestre: t(f, "trimestre")
      });
    const id = await guardarMeta(x);
    await auditar({
      actor: await actor(),
      accion: x.id ? "meta.avance" : "meta.crear",
      entidad: "meta",
      entidadId: id,
      detalle: { titulo: x.titulo, avance: x.avance }
    });
  } catch (e) {
    fallar("/equipo", e);
  }
  revalidatePath("/equipo");
}

export async function borrarMetaAccion(f: FormData) {
  const id = z.string().uuid().parse(t(f, "id"));
  await borrarMeta(id);
  await auditar({ actor: await actor(), accion: "meta.borrar", entidad: "meta", entidadId: id });
  revalidatePath("/equipo");
}

export async function agregarLogroAccion(f: FormData) {
  try {
    const x = z
      .object({
        miembroId: z.string().uuid(),
        texto: z.string().min(3, "Cuéntalo en más de tres letras"),
        trimestre: z.string().regex(/^\d{4}-Q[1-4]$/)
      })
      .parse({ miembroId: t(f, "miembroId"), texto: t(f, "texto"), trimestre: t(f, "trimestre") });
    const id = await agregarLogro(x);
    await auditar({
      actor: await actor(),
      accion: "logro.crear",
      entidad: "logro",
      entidadId: id,
      detalle: { texto: x.texto }
    });
  } catch (e) {
    fallar("/equipo", e);
  }
  revalidatePath("/equipo");
}

export async function borrarLogroAccion(f: FormData) {
  const id = z.string().uuid().parse(t(f, "id"));
  await borrarLogro(id);
  await auditar({ actor: await actor(), accion: "logro.borrar", entidad: "logro", entidadId: id });
  revalidatePath("/equipo");
}

// --- Ingresos & costos ------------------------------------------------------
export async function guardarCostoAccion(f: FormData) {
  try {
    const c = z
      .object({
        id: z.string().uuid().nullable(),
        mes: z.string().regex(/^\d{4}-\d{2}-01$/),
        proveedor: z.string().min(2, "Proveedor"),
        concepto: z.string().max(120),
        categoria: z.enum(["pagos", "infra", "mensajeria", "ia", "herramientas", "otros"]),
        montoMinor: z.number().int().min(0)
      })
      .parse({
        id: t(f, "id") || null,
        mes: `${t(f, "mes").slice(0, 7)}-01`,
        proveedor: t(f, "proveedor"),
        concepto: t(f, "concepto"),
        categoria: t(f, "categoria"),
        montoMinor: n(f, "monto")
      });
    const id = await guardarCosto(c);
    await auditar({
      actor: await actor(),
      accion: "costo.guardar",
      entidad: "costo_proveedor",
      entidadId: id,
      detalle: c
    });
  } catch (e) {
    fallar("/finanzas", e);
  }
  revalidatePath("/finanzas");
  revalidatePath("/");
  revalidatePath("/salud");
}

export async function borrarCostoAccion(f: FormData) {
  const id = z.string().uuid().parse(t(f, "id"));
  await borrarCosto(id);
  await auditar({
    actor: await actor(),
    accion: "costo.borrar",
    entidad: "costo_proveedor",
    entidadId: id
  });
  revalidatePath("/finanzas");
  revalidatePath("/");
  revalidatePath("/salud");
}

export async function guardarCierreAccion(f: FormData) {
  try {
    const c = z
      .object({
        mes: z.string().regex(/^\d{4}-\d{2}-01$/),
        cajaMinor: z.number().int().min(0),
        gastoOperativoMinor: z.number().int().min(0),
        nota: z.string().max(300).nullable()
      })
      .parse({
        mes: `${t(f, "mes").slice(0, 7)}-01`,
        cajaMinor: n(f, "caja"),
        gastoOperativoMinor: n(f, "gastoOperativo"),
        nota: t(f, "nota") || null
      });
    await guardarCierre(c);
    await auditar({
      actor: await actor(),
      accion: "cierre.guardar",
      entidad: "cierre_mes",
      entidadId: c.mes,
      detalle: c
    });
  } catch (e) {
    fallar("/salud", e);
  }
  revalidatePath("/salud");
}

// --- Cuenta canónica --------------------------------------------------------
export async function crearCuentaAccion(f: FormData) {
  try {
    const c = z
      .object({
        nit: z.string().regex(/^\d{5,20}$/, "NIT solo con dígitos, sin puntos ni DV"),
        nombreLegal: z.string().min(3, "Razón social"),
        ciudad: z.string().max(80).nullable()
      })
      .parse({
        nit: t(f, "nit").replace(/\D/g, ""),
        nombreLegal: t(f, "nombreLegal"),
        ciudad: t(f, "ciudad") || null
      });
    const r = await cuentaPorNit(c);
    await auditar({
      actor: await actor(),
      accion: r.nueva ? "cuenta.crear" : "cuenta.reusar",
      entidad: "cuenta",
      entidadId: r.id,
      detalle: c
    });
  } catch (e) {
    fallar("/clientes", e);
  }
  revalidatePath("/clientes");
}

export async function enlazarProductoAccion(f: FormData) {
  try {
    const conMensualidad = t(f, "suscripcionEstado") !== "";
    const e = EnlaceProductoSchema.parse({
      accountId: t(f, "cuentaId"),
      producto: t(f, "producto"),
      origen: t(f, "origen") || "directo",
      ...(conMensualidad
        ? { suscripcion: { estado: t(f, "suscripcionEstado"), mrrMinor: n(f, "mrr") } }
        : {}),
      ...(t(f, "evepayTenantId") ? { evepayTenantId: t(f, "evepayTenantId") } : {})
    });
    const id = await guardarEnlace(e);
    await auditar({
      actor: await actor(),
      accion: "enlace.guardar",
      entidad: "enlace_producto",
      entidadId: id,
      detalle: e
    });
  } catch (e) {
    fallar("/clientes", e);
  }
  revalidatePath("/clientes");
  revalidatePath("/");
  revalidatePath("/finanzas");
  revalidatePath("/salud");
}

export async function borrarEnlaceAccion(f: FormData) {
  const id = z.string().uuid().parse(t(f, "id"));
  await borrarEnlace(id);
  await auditar({
    actor: await actor(),
    accion: "enlace.borrar",
    entidad: "enlace_producto",
    entidadId: id
  });
  revalidatePath("/clientes");
}

export async function cambiarEstadoCuentaAccion(f: FormData) {
  const id = z.string().uuid().parse(t(f, "id"));
  const estado = EstadoCuentaSchema.parse(t(f, "estado"));
  await cambiarEstadoCuenta(id, estado);
  await auditar({
    actor: await actor(),
    accion: "cuenta.estado",
    entidad: "cuenta",
    entidadId: id,
    detalle: { estado }
  });
  revalidatePath("/clientes");
}
