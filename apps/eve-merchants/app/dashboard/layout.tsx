"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getApiKey, getMerchant, logout } from "@/lib/auth";

const NAV = [
  { href: "/dashboard",     label: "Dashboard",     icon: "◈" },
  { href: "/transacciones", label: "Transacciones", icon: "≡" },
  { href: "/ajustes",       label: "Ajustes",       icon: "⊙" }
];

const CDN = "https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1";

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
            <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--eve-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {merchant.legalName}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.75rem 0" }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                padding: "0.625rem 1.5rem", textDecoration: "none",
                fontSize: "0.875rem", fontWeight: active ? 600 : 400,
                color: active ? "#FDFEFF" : "rgba(255,255,255,0.5)",
                background: active ? "rgba(30,111,235,0.18)" : "transparent",
                borderLeft: active ? "3px solid var(--eve-electrico)" : "3px solid transparent",
                transition: "all 0.15s"
              }}>
                <span style={{ fontSize: "1rem", opacity: active ? 1 : 0.65 }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mascota decorativa */}
        <div style={{ display: "flex", justifyContent: "center", padding: "0.75rem 1.5rem 0", pointerEvents: "none" }}>
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <Image
              src="/mascota/mascota.webp"
              alt=""
              fill
              style={{ objectFit: "contain", objectPosition: "bottom" }}
            />
          </div>
        </div>

        {/* Cerrar sesión */}
        <div style={{ padding: "0.75rem 1.5rem 1rem", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
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
