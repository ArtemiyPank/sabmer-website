"use client";

import { useEffect, useRef, useState } from "react";
import {
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import ElevatorSchematic from "./ElevatorSchematic";

/**
 * Fixed full-height background layer holding the elevator schematic.
 * Native page scroll drives the animation (no scroll-jacking).
 *
 * Mobile browsers grow/shrink the visual viewport when the URL bar
 * collapses, which would make both the layer size and scrollYProgress
 * jump mid-scroll. To stay stable we:
 *  - size the layer with 100lvh (large viewport height, constant while
 *    the browser chrome shows/hides), so the SVG never rescales;
 *  - compute progress as scrollY / (scrollHeight - lvh), a range that
 *    doesn't depend on the current innerHeight.
 *
 * - prefers-reduced-motion: static assembled schematic (progress stays 0)
 * - mobile (<768px): cab still travels, exploded view reduced, no annotations
 */
export default function ElevatorBackdrop() {
  const { scrollY } = useScroll();
  const reducedMotion = useReducedMotion();
  const staticProgress = useMotionValue(0);

  const layerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef(1);
  const progress = useTransform(scrollY, (v) =>
    Math.min(Math.max(v / rangeRef.current, 0), 1)
  );

  useEffect(() => {
    const measure = () => {
      // the layer itself is 100lvh tall — use it as the stable yardstick
      const lvh = layerRef.current?.offsetHeight || window.innerHeight;
      rangeRef.current = Math.max(
        document.documentElement.scrollHeight - lvh,
        1
      );
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      ro.disconnect();
    };
  }, []);

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
      ref={layerRef}
      aria-hidden="true"
      className="backdrop-viewport fixed inset-x-0 top-0 -z-10 flex justify-center overflow-hidden"
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
        progress={reducedMotion ? staticProgress : progress}
        explode={isMobile ? 0.35 : 1}
        showAnnotations={!isMobile}
      />
    </div>
  );
}
