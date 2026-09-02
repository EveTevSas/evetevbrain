/**
 * Fondo pastel de marca (patrón packages/brand/patrones/login/).
 * Capas: blanco → ilustración opcional (opacity 0.13) → degradado lila → grid.
 */

interface GradientBackgroundProps {
  className?: string;
  /** Ilustración de /marca (la sirve la propia app vía `pnpm marca:sync`). */
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

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(196, 181, 253, 0.55) 0%, rgba(221, 214, 254, 0.3) 35%, rgba(255,255,255,0) 70%)"
        }}
      />

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
