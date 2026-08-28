/**
 * GradientBackground — Fondo pastel para páginas de login Evetev
 *
 * Capas (de abajo hacia arriba):
 *  1. Base blanca
 *  2. Imagen de ilustración opcional (opacity 0.13)
 *  3. Degradado lila radial superior-derecho
 *  4. Grid sutil 80×80 px
 *
 * Uso sin imagen (EveLedger):
 *   <GradientBackground className="absolute inset-0" />
 *
 * Uso con imagen (EveConecta):
 *   <GradientBackground
 *     className="absolute inset-0"
 *     illustrationUrl="https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/ilustraciones/conjunto-residencial-calle.webp"
 *   />
 */

interface GradientBackgroundProps {
  /** Clase CSS adicional (posición, z-index, etc.) */
  className?: string;
  /**
   * URL de la ilustración de fondo.
   * Se renderiza a opacity 0.13, debajo del degradado lila.
   * Usar imágenes del CDN: https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/ilustraciones/
   */
  illustrationUrl?: string;
}

export function GradientBackground({ className, illustrationUrl }: GradientBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff"
      }}
    >
      {/* Capa 2: ilustración opcional con baja opacidad */}
      {illustrationUrl && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url('${illustrationUrl}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.13
          }}
        />
      )}

      {/* Capa 3: degradado lila desde esquina superior derecha */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(196, 181, 253, 0.55) 0%, rgba(221, 214, 254, 0.3) 35%, rgba(255,255,255,0) 70%)"
        }}
      />

      {/* Capa 4: grid sutil (encima de todo) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(180,180,200,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(180,180,200,0.18) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px"
        }}
      />
    </div>
  );
}
