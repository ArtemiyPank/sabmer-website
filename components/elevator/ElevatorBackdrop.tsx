"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useReducedMotion, useScroll } from "framer-motion";
import ElevatorSchematic from "./ElevatorSchematic";

/**
 * Fixed full-height background layer holding the elevator schematic.
 * Native page scroll drives the animation (no scroll-jacking):
 * scrollYProgress of the whole document maps 0..1 onto the schematic.
 *
 * - prefers-reduced-motion: static assembled schematic (progress stays 0)
 * - mobile (<768px): cab still travels, exploded view reduced, no annotations
 */
export default function ElevatorBackdrop() {
  const { scrollYProgress } = useScroll();
  const reducedMotion = useReducedMotion();
  const staticProgress = useMotionValue(0);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 flex justify-center overflow-hidden"
      style={{
        opacity: "var(--bp-layer-opacity)",
        backgroundColor: "var(--bp-paper)",
        // drafting-paper grid: minor 25px, major 125px
        backgroundImage: `
          linear-gradient(var(--bp-grid-major) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-grid-major) 1px, transparent 1px),
          linear-gradient(var(--bp-grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-grid) 1px, transparent 1px)`,
        backgroundSize: "125px 125px, 125px 125px, 25px 25px, 25px 25px",
      }}
    >
      <ElevatorSchematic
        progress={reducedMotion ? staticProgress : scrollYProgress}
        explode={isMobile ? 0.35 : 1}
        showAnnotations={!isMobile}
      />
    </div>
  );
}
