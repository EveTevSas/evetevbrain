"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RolInterno } from "@/lib/auth/permissions";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Percent,
  Plug,
  Scale,
  ScrollText,
  ShieldAlert,
  TriangleAlert,
  UsersRound,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Conteos que piden atención; los calcula el layout (servidor) y aquí solo se pintan. */
export interface Insignias {
  comercios?: number;
  riesgo?: number;
  contracargos?: number;
}

interface Entrada {
  href: string;
  etiqueta: string;
  Icono: LucideIcon;
  insignia?: keyof Insignias;
  /** Cómo decidir que está activa cuando el href lleva query o comparte prefijo con otra. */
  activaSi?: (pathname: string, search: string) => boolean;
}

/**
 * Tres grupos, como se piensa la operación: lo que pasa todos los días, lo
 * que protege el dinero y lo que configura la plataforma.
 */
const GRUPOS: { titulo: string; entradas: Entrada[] }[] = [
  {
    titulo: "Operación",
    entradas: [
      { href: "/", etiqueta: "Command Center", Icono: LayoutDashboard },
      {
        href: "/comercios",
        etiqueta: "Comercios",
        Icono: Building2,
        insignia: "comercios",
        activaSi: (p, s) => p.startsWith("/comercios") && !s.includes("filtro=onboarding")
      },
      { href: "/pagos", etiqueta: "Transacciones", Icono: ArrowLeftRight },
      { href: "/dispersion", etiqueta: "Liquidación & Dispersión", Icono: ArrowUpRight },
      { href: "/conciliacion", etiqueta: "Ledger & Conciliación", Icono: Scale }
    ]
  },
  {
    titulo: "Riesgo",
    entradas: [
      { href: "/riesgo", etiqueta: "Riesgo & Antifraude", Icono: ShieldAlert, insignia: "riesgo" },
      {
        href: "/contracargos",
        etiqueta: "Contracargos",
        Icono: TriangleAlert,
        insignia: "contracargos"
      },
      {
        href: "/comercios?filtro=onboarding",
        etiqueta: "Onboarding & KYC/KYB",
        Icono: ClipboardCheck,
        activaSi: (p, s) => p.startsWith("/comercios") && s.includes("filtro=onboarding")
      }
    ]
  },
  {
    titulo: "Plataforma",
    entradas: [
      { href: "/tarifas", etiqueta: "Comisiones & Pricing", Icono: Percent },
      { href: "/proveedores", etiqueta: "Configuración", Icono: Plug },
      { href: "/reportes", etiqueta: "Reportes", Icono: FileSpreadsheet },
      { href: "/auditoria", etiqueta: "Auditoría", Icono: ScrollText },
      { href: "/usuarios", etiqueta: "Usuarios & RBAC", Icono: UsersRound }
    ]
  }
];

function iniciales(actor: string): string {
  const base = actor.split("@")[0] ?? "";
  const partes = base.split(/[._-]+/).filter(Boolean);
  return (
    partes
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function NavConsola({
  actor,
  rol,
  insignias
}: {
  actor: string;
  rol: RolInterno | null;
  insignias: Insignias;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams().toString();

  async function salir() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      style={{
        width: 236,
        minHeight: "100vh",
        background: "#ffffff",
        borderRight: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 0.75rem 1rem",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        flexShrink: 0
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0 0.5rem",
          marginBottom: "1.4rem"
        }}
      >
        <Image src="/marca/isotipo-azul-noche.svg" alt="" width={26} height={26} />
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0A2540" }}>EvePay Admin</span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "1.1rem", flex: 1 }}>
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <div
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#94A3B8",
                padding: "0 0.75rem",
                marginBottom: "0.35rem"
              }}
            >
              {g.titulo}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {g.entradas.map(({ href, etiqueta, Icono, insignia, activaSi }) => {
                const ruta = href.split("?")[0] ?? href;
                const activa = activaSi
                  ? activaSi(pathname, search)
                  : ruta === "/"
                    ? pathname === "/"
                    : pathname.startsWith(ruta);
                const n = insignia ? insignias[insignia] : undefined;
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: 9,
                      textDecoration: "none",
                      fontSize: "0.84rem",
                      fontWeight: activa ? 700 : 500,
                      color: activa ? "#4b3075" : "#475569",
                      background: activa ? "#f3eeff" : "transparent"
                    }}
                  >
                    <Icono
                      size={16}
                      color={activa ? "#4b3075" : "#94A3B8"}
                      style={{ flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>{etiqueta}</span>
                    {n != null && n > 0 && (
                      <span
                        aria-label={`${n} pendiente(s)`}
                        style={{
                          background: "#B91C1C",
                          color: "#fff",
                          borderRadius: 999,
                          minWidth: 20,
                          height: 20,
                          padding: "0 6px",
                          display: "inline-grid",
                          placeItems: "center",
                          fontSize: "0.68rem",
                          fontWeight: 700
                        }}
                      >
                        {n}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        style={{
          borderTop: "1px solid #E2E8F0",
          marginTop: "1rem",
          paddingTop: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.9rem 0.5rem 0"
        }}
      >
        <div
          aria-hidden
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#0A2540",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: "0.74rem",
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {iniciales(actor)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            title={actor}
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#0A2540",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {actor.split("@")[0]}
          </div>
          <div style={{ fontSize: "0.7rem", color: "#64748B" }}>Rol: {rol ?? "sin rol"}</div>
        </div>
        <button
          type="button"
          onClick={() => void salir()}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 4,
            display: "grid",
            placeItems: "center"
          }}
        >
          <LogOut size={16} color="#94A3B8" />
        </button>
      </div>
    </aside>
  );
}
