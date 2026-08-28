export function GradientBackground({ className }: { className?: string }) {
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
      {/* Imagen de fondo: conjunto residencial con opacidad baja */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "url('https://cdn.jsdelivr.net/gh/Evetev-Dev/brand@1/ilustraciones/conjunto-residencial-calle.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.13
        }}
      />

      {/* Degradado lila desde esquina superior derecha (encima de la imagen) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(196, 181, 253, 0.55) 0%, rgba(221, 214, 254, 0.3) 35%, rgba(255,255,255,0) 70%)"
        }}
      />

      {/* Grid sutil (encima de todo) */}
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
