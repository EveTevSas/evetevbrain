"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getApiKey, getMerchant, logout } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/transacciones", label: "Transacciones", icon: "≡" },
  { href: "/ajustes", label: "Ajustes", icon: "⊙" }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [merchant, setMerchant] = useState<{ legalName: string } | null>(null);

  useEffect(() => {
    if (!getApiKey()) { router.replace("/login"); return; }
    setMerchant(getMerchant());
  }, [router]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: "var(--navy)", color: "#fff",
        display: "flex", flexDirection: "column", padding: "1.5rem 0",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10
      }}>
        {/* Logo */}
        <div style={{ padding: "0 1.5rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="10" fill="var(--coral)" />
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="700">E</text>
            </svg>
            <span style={{ fontWeight: "700", fontSize: "1.1rem" }}>EvePay</span>
          </div>
          {merchant && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {merchant.legalName}
            </p>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.625rem 1.5rem", textDecoration: "none",
                color: active ? "#fff" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                borderLeft: active ? "3px solid var(--coral)" : "3px solid transparent",
                fontSize: "0.875rem", fontWeight: active ? "600" : "400",
                transition: "all 0.15s"
              }}>
                <span style={{ fontSize: "1rem" }}>{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={handleLogout} className="btn-ghost" style={{
            width: "100%", color: "rgba(255,255,255,0.55)", borderColor: "rgba(255,255,255,0.15)",
            fontSize: "0.8rem"
          }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, marginLeft: 220, padding: "2rem", maxWidth: "calc(100vw - 220px)" }}>
        {children}
      </main>
    </div>
  );
}
