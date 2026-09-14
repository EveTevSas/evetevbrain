/**
 * Se muestra en lugar de las vistas cuando la base del Hub no está lista.
 * Solo la ve gente autenticada del equipo (el proxy va antes), así que el
 * texto puede ser concreto sobre qué falta.
 */
export function ConfiguracionPendiente({ motivo }: { motivo: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#F5F5F5"
      }}
    >
      <div
        style={{
          maxWidth: 560,
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 16,
          padding: "2rem"
        }}
      >
        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#B45309",
            letterSpacing: "0.06em"
          }}
        >
          CONFIGURACIÓN PENDIENTE
        </div>
        <h1 style={{ margin: "0.4rem 0 0.8rem", fontSize: "1.2rem", color: "#0A2540" }}>
          El Hub no llega a su base de datos
        </h1>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#0A2540", lineHeight: 1.6 }}>{motivo}</p>
        <ol
          style={{
            margin: "1rem 0 0",
            paddingLeft: "1.2rem",
            fontSize: "0.82rem",
            color: "#475569",
            lineHeight: 1.7
          }}
        >
          <li>
            En el Supabase alojado, crear el rol una vez:{" "}
            <code>create role hub_app with login password &apos;…&apos; nobypassrls;</code>
          </li>
          <li>
            Aplicar <code>apps/api/supabase/migrations/0024_hub.sql</code> (crea el schema{" "}
            <code>hub</code> y los GRANT).
          </li>
          <li>
            En Vercel, <code>HUB_DATABASE_URL</code> con el pooler del proyecto y ese rol; redeploy.
          </li>
        </ol>
        <p style={{ margin: "1rem 0 0", fontSize: "0.74rem", color: "#94A3B8" }}>
          Paso a paso en docs/DESPLIEGUE.md §3b.
        </p>
      </div>
    </main>
  );
}
