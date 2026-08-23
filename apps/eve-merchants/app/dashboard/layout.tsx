"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getApiKey, getMerchant, logout } from "@/lib/auth";

const CDN = "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1";

/* ── Iconos SVG ─────────────────────────────────────────── */
function IconDashboard({ active }: { active: boolean }) {
  const c = active ? "var(--eve-electrico)" : "var(--eve-pizarra)";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
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
function IconTransacciones({ active }: { active: boolean }) {
  const c = active ? "var(--eve-electrico)" : "var(--eve-pizarra)";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
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
function IconAjustes({ active }: { active: boolean }) {
  const c = active ? "var(--eve-electrico)" : "var(--eve-pizarra)";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/transacciones", label: "Transacciones", Icon: IconTransacciones },
  { href: "/ajustes", label: "Ajustes", Icon: IconAjustes }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [merchant, setMerchant] = useState<{ legalName: string } | null>(null);

  useEffect(() => {
    if (!getApiKey()) {
      router.replace("/login");
      return;
    }
    setMerchant(getMerchant());
  }, [router]);

  const initials = merchant?.legalName
    ? merchant.legalName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ME";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--eve-tinte)" }}>
      {/* ── Sidebar blanco (estilo EveConecta) ──── */}
      <aside
        style={{
          width: 240,
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 10,
          borderRight: "1px solid var(--eve-linea)"
        }}
      >
        {/* Logo */}
        <div
          style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid var(--eve-linea)" }}
        >
          <Link
            href="/dashboard"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
          >
            <img src={`${CDN}/isotipos/isotipo-azul-noche.svg`} alt="" width={26} height={19} />
            <div>
              <div
                style={{
                  fontFamily: "'Baloo 2',sans-serif",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "var(--eve-azul-noche)",
                  lineHeight: 1.2
                }}
              >
                EvePay
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--eve-muted)"
                }}
              >
                una vertical de evetev
              </div>
            </div>
          </Link>
        </div>

        {/* Comercio activo */}
        {merchant && (
          <div
            style={{
              margin: "0.75rem 0.875rem",
              padding: "0.75rem",
              background: "var(--eve-tinte)",
              borderRadius: 10,
              border: "1px solid var(--eve-linea)"
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: "0.82rem",
                color: "var(--eve-azul-noche)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {merchant.legalName}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                marginTop: "0.25rem"
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--eve-exito)",
                  display: "inline-block",
                  flexShrink: 0
                }}
              />
              <span style={{ fontSize: "0.72rem", color: "var(--eve-pizarra)" }}>En línea</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.25rem 0.875rem" }}>
          {NAV.map(({ href, label, Icon }) => {
            const active =
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.625rem 0.75rem",
                  marginBottom: "0.125rem",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--eve-electrico)" : "var(--eve-azul-noche)",
                  background: active ? "#EEF4FF" : "transparent",
                  borderRadius: 8,
                  transition: "all 0.15s"
                }}
              >
                <Icon active={active} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Usuario */}
        <div
          style={{
            padding: "0.875rem",
            borderTop: "1px solid var(--eve-linea)",
            display: "flex",
            alignItems: "center",
            gap: "0.625rem"
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--eve-azul-noche)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--eve-azul-noche)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              {merchant?.legalName ?? "Mi cuenta"}
            </p>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--eve-muted)" }}>
              Administración
            </p>
          </div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            title="Cerrar sesión"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--eve-pizarra)",
              flexShrink: 0
            }}
          >
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Área principal ───────────────────────── */}
      <div
        style={{
          flex: 1,
          marginLeft: 240,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh"
        }}
      >
        {/* Top bar */}
        <header
          style={{
            height: 56,
            background: "#fff",
            borderBottom: "1px solid var(--eve-linea)",
            display: "flex",
            alignItems: "center",
            padding: "0 2rem",
            gap: "1rem",
            position: "sticky",
            top: 0,
            zIndex: 9
          }}
        >
          {/* Breadcrumb */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img
              src={`${CDN}/isotipos/isotipo-azul-noche.svg`}
              alt=""
              width={18}
              height={13}
              style={{ opacity: 0.5 }}
            />
            <span style={{ fontSize: "0.82rem", color: "var(--eve-pizarra)" }}>
              {pathname === "/dashboard"
                ? "Dashboard"
                : pathname.startsWith("/transacciones")
                  ? "Transacciones"
                  : pathname.startsWith("/ajustes")
                    ? "Ajustes"
                    : "EvePay"}
            </span>
          </div>
          {/* Estado */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              fontSize: "0.8rem",
              color: "var(--eve-pizarra)"
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--eve-exito)",
                display: "inline-block"
              }}
            />
            En línea
          </div>
        </header>

        {/* Contenido */}
        <main style={{ flex: 1, padding: "2rem 2.5rem" }}>{children}</main>
      </div>
    </div>
  );
}
