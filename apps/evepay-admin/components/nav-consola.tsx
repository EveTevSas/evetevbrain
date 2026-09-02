"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowLeftRight, Building2, LayoutDashboard, LogOut, Plug, Scale } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const SECCIONES = [
  { href: "/", etiqueta: "Inicio", Icono: LayoutDashboard },
  { href: "/comercios", etiqueta: "Comercios", Icono: Building2 },
  { href: "/proveedores", etiqueta: "Proveedores", Icono: Plug },
  { href: "/pagos", etiqueta: "Pagos", Icono: ArrowLeftRight },
  { href: "/conciliacion", etiqueta: "Conciliación", Icono: Scale }
] as const;

export function NavConsola() {
  const pathname = usePathname();
  const router = useRouter();

  async function salir() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      style={{
        width: 220,
        minHeight: "100vh",
        background: "#ffffff",
        borderRight: "1px solid #E2E8F0",
        display: "flex",
        flexDirection: "column",
        padding: "1.25rem 0.75rem",
        boxSizing: "border-box",
        position: "sticky",
        top: 0
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0 0.5rem",
          marginBottom: "1.5rem"
        }}
      >
        <Image src="/marca/isotipo-azul-noche.svg" alt="" width={26} height={26} />
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0A2540" }}>EvePay Admin</span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {SECCIONES.map(({ href, etiqueta, Icono }) => {
          const activa = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.55rem 0.75rem",
                borderRadius: 9,
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: activa ? 700 : 500,
                color: activa ? "#4b3075" : "#475569",
                background: activa ? "#f3eeff" : "transparent"
              }}
            >
              <Icono size={16} color={activa ? "#4b3075" : "#94A3B8"} />
              {etiqueta}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => void salir()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.55rem 0.75rem",
          borderRadius: 9,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 500,
          color: "#64748B"
        }}
      >
        <LogOut size={16} color="#94A3B8" />
        Cerrar sesión
      </button>
    </aside>
  );
}
