"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

/* Los activos de marca se sirven desde esta misma app (public/marca), no
   desde un CDN externo: la carpeta la llena `pnpm marca:sync` desde
   packages/brand, que es la fuente única, y el CI vigila que no se desvíe. */
const CDN = "/marca";

/* ── Iconos SVG 16×16 stroke ───────────────────────────── */
function IcoDashboard() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IcoCierres() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}
function IcoInventarios() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IcoCartera() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}
function IcoFinanciero() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IcoConsolidado() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="9" x2="9" y2="21" />
    </svg>
  );
}
function IcoConfig() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IcoLogout() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

/* ── Secciones del nav ─────────────────────────────────── */
const SECCIONES = [
  {
    label: "OPERACIÓN",
    items: [
      { href: "/dashboard", texto: "Dashboard", Ico: IcoDashboard },
      { href: "/cierres", texto: "Diario", Ico: IcoCierres },
      { href: "/inventarios", texto: "Inventarios", Ico: IcoInventarios },
      { href: "/cartera", texto: "Cartera", Ico: IcoCartera }
    ]
  },
  {
    label: "REPORTES",
    items: [
      { href: "/financiero", texto: "Margen y gastos", Ico: IcoFinanciero },
      { href: "/consolidado", texto: "Ventas", Ico: IcoConsolidado }
    ]
  },
  {
    label: "SISTEMA",
    items: [{ href: "/config", texto: "Configuración", Ico: IcoConfig }]
  }
];

export default function SidebarNav({ email }: { email?: string }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      style={{
        width: 240,
        background: "#fff",
        borderRight: "1px solid #EDF3FA",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40
      }}
    >
      {/* Logo */}
      <div style={{ padding: "1.25rem 1rem 1rem", borderBottom: "1px solid #EDF3FA" }}>
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${CDN}/isotipo-azul-noche.svg`} alt="" width={28} height={20} />
          <div>
            <div
              style={{
                fontFamily: "var(--font-brand)",
                fontWeight: 700,
                fontSize: "1rem",
                color: "#0A2540",
                lineHeight: 1.2
              }}
            >
              EveLedger
            </div>
            <div
              style={{
                fontSize: "0.62rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#94A3B8"
              }}
            >
              por Evetev
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.75rem 0.75rem", overflowY: "auto" }}>
        {SECCIONES.map((sec) => (
          <div key={sec.label} style={{ marginBottom: "1.5rem" }}>
            <p
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#94A3B8",
                padding: "0 0.5rem",
                marginBottom: "0.375rem"
              }}
            >
              {sec.label}
            </p>
            {sec.items.map(({ href, texto, Ico }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.5rem 0.625rem",
                    marginBottom: "0.125rem",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: "0.855rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "#4b3075" : "#0A2540",
                    background: active ? "#f3eeff" : "transparent",
                    transition: "all 0.12s"
                  }}
                >
                  <span style={{ color: active ? "#4b3075" : "#64748B", flexShrink: 0 }}>
                    <Ico />
                  </span>
                  {texto}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Usuario + logout */}
      <div
        style={{
          padding: "0.875rem 1rem",
          borderTop: "1px solid #EDF3FA",
          display: "flex",
          alignItems: "center",
          gap: "0.625rem"
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#0A2540",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#fff",
            flexShrink: 0
          }}
        >
          AD
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#0A2540",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            Administrador
          </p>
          {email && (
            <p
              style={{
                margin: 0,
                fontSize: "0.68rem",
                color: "#94A3B8",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {email}
            </p>
          )}
        </div>
        <form action={logout}>
          <button
            type="submit"
            title="Cerrar sesión"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 6,
              color: "#64748B",
              borderRadius: 6,
              flexShrink: 0,
              display: "flex",
              alignItems: "center"
            }}
          >
            <IcoLogout />
          </button>
        </form>
      </div>
    </aside>
  );
}
