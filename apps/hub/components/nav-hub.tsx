"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Boxes,
  DollarSign,
  FileText,
  Globe,
  HeartPulse,
  LayoutGrid,
  LogOut,
  Target,
  Users,
  type LucideIcon
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const GRUPOS: {
  titulo: string;
  entradas: { href: string; etiqueta: string; Icono: LucideIcon }[];
}[] = [
  {
    titulo: "Compañía",
    entradas: [
      { href: "/", etiqueta: "Global", Icono: Globe },
      { href: "/portales", etiqueta: "Portales & accesos", Icono: LayoutGrid },
      { href: "/productos", etiqueta: "Productos", Icono: Boxes }
    ]
  },
  {
    titulo: "Negocio",
    entradas: [
      { href: "/clientes", etiqueta: "Clientes (unificado)", Icono: Users },
      { href: "/finanzas", etiqueta: "Ingresos & costos", Icono: DollarSign },
      { href: "/salud", etiqueta: "Salud financiera", Icono: HeartPulse }
    ]
  },
  {
    titulo: "Interno",
    entradas: [
      { href: "/equipo", etiqueta: "Equipo & metas", Icono: Target },
      { href: "/docs", etiqueta: "Documentos", Icono: FileText }
    ]
  }
];

export function NavHub({ nombre, email }: { nombre: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const iniciales =
    nombre
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  async function salir() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        background: "#0A2540",
        color: "#C9D3E0",
        display: "flex",
        flexDirection: "column",
        padding: "1.2rem 0.75rem 0.9rem",
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
          gap: "0.65rem",
          padding: "0 0.5rem",
          marginBottom: "0.6rem"
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "#fff",
            display: "grid",
            placeItems: "center"
          }}
        >
          <Image src="/marca/isotipo-azul-noche.svg" alt="" width={20} height={20} />
        </div>
        <div>
          <div
            style={{ fontWeight: 800, color: "#fff", fontSize: "1rem", letterSpacing: "-0.01em" }}
          >
            Evetev
          </div>
          <div style={{ fontSize: "0.68rem", color: "#7F93AD", marginTop: -2 }}>Hub interno</div>
        </div>
      </div>
      <div
        style={{
          margin: "0.4rem 0.25rem 0.8rem",
          padding: "0.45rem 0.7rem",
          border: "1px solid #1E3A5F",
          borderRadius: 8,
          fontSize: "0.72rem",
          color: "#A9B8CC",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}
      >
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#8B6ED6",
            boxShadow: "0 0 0 3px rgba(139,110,214,.25)"
          }}
        />
        Torre de control · compañía
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "0.9rem", flex: 1 }}>
        {GRUPOS.map((g) => (
          <div key={g.titulo}>
            <div
              style={{
                fontSize: "0.64rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#5F7391",
                padding: "0 0.75rem",
                marginBottom: "0.3rem"
              }}
            >
              {g.titulo}
            </div>
            {g.entradas.map(({ href, etiqueta, Icono }) => {
              const activa = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.65rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: 9,
                    textDecoration: "none",
                    fontSize: "0.84rem",
                    fontWeight: activa ? 700 : 500,
                    color: activa ? "#fff" : "#C9D3E0",
                    background: activa
                      ? "linear-gradient(90deg, rgba(139,110,214,.35), rgba(139,110,214,.08))"
                      : "transparent",
                    boxShadow: activa ? "inset 2px 0 0 #8B6ED6" : "none",
                    margin: "1px 0"
                  }}
                >
                  <Icono size={16} color={activa ? "#fff" : "#7F93AD"} />
                  {etiqueta}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        style={{
          borderTop: "1px solid #1E3A5F",
          paddingTop: "0.8rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.8rem 0.4rem 0"
        }}
      >
        <div
          aria-hidden
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#1E3A5F",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: "0.72rem",
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {iniciales}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {nombre}
          </div>
          <div
            title={email}
            style={{
              fontSize: "0.68rem",
              color: "#7F93AD",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {email}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void salir()}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
        >
          <LogOut size={16} color="#7F93AD" />
        </button>
      </div>
    </aside>
  );
}
