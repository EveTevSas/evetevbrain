"use client";

import { useEffect, useCallback } from "react";

export default function ParticlesBackground() {
  const initParticles = useCallback(() => {
    const oldCanvas = document.querySelector("#particles-js canvas");
    if (oldCanvas) oldCanvas.remove();

    // @ts-ignore
    if (window.pJSDom?.length > 0) {
      // @ts-ignore
      window.pJSDom.forEach((p: any) => p.pJS.fn.vendors.destroypJS());
      // @ts-ignore
      window.pJSDom = [];
    }

    // @ts-ignore
    window.particlesJS("particles-js", {
      particles: {
        number: { value: 120, density: { enable: true, value_area: 800 } },
        color: { value: "#0A2540" },
        shape: { type: "circle", stroke: { width: 0, color: "#0A2540" } },
        opacity: {
          value: 0.35,
          random: true,
          anim: { enable: true, speed: 1, opacity_min: 0.1 },
        },
        size: {
          value: 3,
          random: true,
          anim: { enable: true, speed: 2, size_min: 0.5 },
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: "#1E6FEB",
          opacity: 0.25,
          width: 1,
        },
        move: { enable: true, speed: 1.5, random: true, out_mode: "bounce" },
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: true, mode: "grab" },
          onclick: { enable: true, mode: "push" },
          resize: true,
        },
        modes: {
          grab: { distance: 200, line_linked: { opacity: 0.6 } },
          push: { particles_nb: 3 },
        },
      },
      retina_detect: true,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => initParticles();

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, [initParticles]);

  return (
    <div
      id="particles-js"
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(145deg, #dce8f8 0%, #c8dcf4 40%, #b8d0f0 100%)",
      }}
    />
  );
}
