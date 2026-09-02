import Link from "next/link";
import { Tarjeta, TituloSeccion } from "@/components/seccion";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const SECCIONES = [
  {
    href: "/comercios",
    titulo: "Comercios",
    detalle: "Onboarding, API keys y estados KYC de cada comercio."
  },
  {
    href: "/proveedores",
    titulo: "Proveedores",
    detalle: "Adquirencia activa (ComboPay), salud y checklist de habilitación."
  },
  {
    href: "/pagos",
    titulo: "Pagos",
    detalle: "Cobros cross-tenant con su línea de tiempo completa."
  },
  {
    href: "/conciliacion",
    titulo: "Conciliación",
    detalle: "Cuadre contra el proveedor y ledger con saldo reconstruido."
  }
] as const;

export default async function InicioPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <>
      <TituloSeccion
        titulo={`Hola${user?.email ? `, ${user.email}` : ""}`}
        descripcion="Consola de operación de EvePay. Elige una sección para empezar."
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem"
        }}
      >
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: "none" }}>
            <Tarjeta>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#4b3075" }}>
                {s.titulo}
              </p>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.83rem", color: "#64748B" }}>
                {s.detalle}
              </p>
            </Tarjeta>
          </Link>
        ))}
      </div>
    </>
  );
}
