"use client";

/** Último recurso: algo falló al renderizar una vista. Next oculta el detalle en producción; aquí se dice dónde mirarlo. */
export default function ErrorHub({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #FECACA",
        borderRadius: 14,
        padding: "1.5rem",
        maxWidth: 640
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1rem", color: "#B91C1C" }}>
        Esta vista no se pudo cargar
      </h2>
      <p style={{ margin: "0.6rem 0 0", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
        El detalle está en los <strong>Runtime Logs</strong> del proyecto en Vercel
        {error.digest ? (
          <>
            {" "}
            (busca el digest <code>{error.digest}</code>)
          </>
        ) : null}
        . Lo más común: la API de EvePay no responde o la base del Hub perdió la conexión.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          marginTop: "1rem",
          border: "1px solid #E2E8F0",
          background: "#fff",
          borderRadius: 9,
          padding: "0.5rem 0.9rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          cursor: "pointer"
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
