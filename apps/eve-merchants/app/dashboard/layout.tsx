"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getApiKey, getMerchant, logout } from "@/lib/auth";

const CDN = "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1";

function IconDashboard({ active }: { active: boolean }) {
  const c = active ? "#FDFEFF" : "rgba(255,255,255,0.45)";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconTransacciones({ active }: { active: boolean }) {
  const c = active ? "#FDFEFF" : "rgba(255,255,255,0.45)";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function IconAjustes({ active }: { active: boolean }) {
  const c = active ? "#FDFEFF" : "rgba(255,255,255,0.45)";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const NAV = [
  { href: "/dashboard",     label: "Dashboard",     Icon: IconDashboard },
  { href: "/transacciones", label: "Transacciones", Icon: IconTransacciones },
  { href: "/ajustes",       label: "Ajustes",       Icon: IconAjustes },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [merchant, setMerchant] = useState<{ legalName: string } | null>(null);

  useEffect(() => {
    if (!getApiKey()) { router.replace("/login"); return; }
    setMerchant(getMerchant());
  }, [router]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* ── Sidebar ─────────────────────────────── */}
      <aside style={{
        width: 228,
        background: "var(--eve-azul-noche)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        zIndex: 10,
        boxShadow: "2px 0 16px rgba(10,37,64,.15)"
      }}>

        {/* Logo */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.625rem", textDecoration: "none" }}>
            <img src={`${CDN}/isotipos/isotipo-blanco.svg`} alt="" width={28} height={20} />
            <span style={{ fontFamily: "'Baloo 2',sans-serif", fontWeight: 600, fontSize: "1.05rem", color: "#FDFEFF" }}>
              EvePay
            </span>
          </Link>
          {merchant && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {merchant.legalName}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.75rem 0" }}>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: "0.875rem",
                padding: "0.75rem 1.5rem", textDecoration: "none",
                fontSize: "0.875rem", fontWeight: active ? 600 : 400,
                color: active ? "#FDFEFF" : "rgba(255,255,255,0.5)",
                background: active ? "rgba(30,111,235,0.18)" : "transparent",
                borderLeft: active ? "3px solid var(--eve-electrico)" : "3px solid transparent",
                transition: "all 0.15s"
              }}>
                <Icon active={active} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Cerrar sesión */}
        <div style={{ padding: "0.75rem 1.5rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            style={{
              width: "100%", background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--eve-radio-pill)",
              color: "rgba(255,255,255,0.45)", fontSize: "0.8rem",
              fontFamily: "'Inter',sans-serif", padding: "8px 16px",
              cursor: "pointer", transition: "all 0.15s"
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido ───────────────────────────── */}
      <main style={{ flex: 1, marginLeft: 228, padding: "2rem 2.5rem", minHeight: "100vh", background: "#FDFEFF" }}>
        {children}
      </main>
    </div>
  );
}
