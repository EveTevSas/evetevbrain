"use client";

import { Check } from "lucide-react";

/**
 * Barra de progreso de un formulario por pasos.
 *
 * Marca los ya recorridos y deja volver a ellos: si alguien se equivocó en el
 * NIT en el paso 1, tener que cancelar y empezar de cero sería absurdo. Hacia
 * adelante no se salta, porque cada paso valida lo suyo antes de dejar pasar.
 */
export function BarraPasos({
  pasos,
  actual,
  onIr
}: {
  pasos: string[];
  actual: number;
  onIr: (i: number) => void;
}) {
  return (
    <ol
      style={{
        display: "flex",
        listStyle: "none",
        margin: 0,
        padding: 0,
        gap: "0.35rem",
        flexWrap: "wrap"
      }}
    >
      {pasos.map((nombre, i) => {
        const hecho = i < actual;
        const activo = i === actual;
        const alcanzable = i <= actual;

        return (
          <li key={nombre} style={{ flex: "1 1 130px", minWidth: 120 }}>
            <button
              type="button"
              onClick={() => alcanzable && onIr(i)}
              disabled={!alcanzable}
              aria-current={activo ? "step" : undefined}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: alcanzable ? "pointer" : "default"
              }}
            >
              <div
                style={{
                  height: 3,
                  borderRadius: 2,
                  background: activo ? "#4b3075" : hecho ? "#BBF7D0" : "#E2E8F0",
                  marginBottom: "0.4rem"
                }}
              />
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.72rem",
                  fontWeight: activo ? 700 : 600,
                  color: activo ? "#4b3075" : hecho ? "#15803D" : "#94A3B8"
                }}
              >
                {hecho && <Check size={12} />}
                {i + 1}. {nombre}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Envoltorio de un paso. Se OCULTA con CSS en vez de desmontarse: si los
 * campos salieran del DOM, sus valores no viajarían en el envío y habría que
 * duplicar todo el formulario en estado de React. Así el formulario sigue
 * siendo uno solo y el navegador conserva lo escrito.
 */
export function Paso({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div hidden={!visible} aria-hidden={!visible}>
      {children}
    </div>
  );
}
