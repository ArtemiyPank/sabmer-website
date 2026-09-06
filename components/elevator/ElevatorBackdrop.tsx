"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import {
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import ElevatorSchematic from "./ElevatorSchematic";
import { UI_PAN, readUi, subscribeUi } from "@/lib/ui-variant";

// three.js + the scene are loaded on the client only, after hydration
const ElevatorScene = dynamic(() => import("../elevator3d/ElevatorScene"), {
  ssr: false,
});

let webglSupport: boolean | null = null;
function detectWebGL() {
  if (webglSupport === null) {
    try {
      const c = document.createElement("canvas");
      webglSupport = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noopSubscribe = () => () => {};

const MOBILE_QUERY = "(max-width: 767px)";
function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const isMobileSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;

/**
 * Fixed full-height background layer holding the 3D hoistway (with the 2D
 * blueprint schematic as a fallback when WebGL is unavailable). Native page
 * scroll drives the animation (no scroll-jacking).
 *
 * Mobile browsers grow/shrink the visual viewport when the URL bar
 * collapses, which would make both the layer size and scrollYProgress
 * jump mid-scroll. To stay stable we:
 *  - size the layer with 100lvh (large viewport height, constant while
 *    the browser chrome shows/hides), so the scene never rescales;
 *  - compute progress as scrollY / (scrollHeight - lvh), a range that
 *    doesn't depend on the current innerHeight.
 *
 * `rtl` mirrors the sideways pan of the drawing, because the text column of
 * every layout sits on the opposite side on the Hebrew locale.
 *
 * - prefers-reduced-motion: static assembled scene (progress stays 0)
 * - mobile (<768px): car still travels, exploded view reduced, no callouts,
 *   no shadows
 */
export default function ElevatorBackdrop({ rtl = false }: { rtl?: boolean }) {
  const { scrollY } = useScroll();
  const reducedMotion = useReducedMotion();
  const staticProgress = useMotionValue(0);

  const layerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef(1);
  const progress = useTransform(scrollY, (v) =>
    Math.min(Math.max(v / rangeRef.current, 0), 1)
  );

  useEffect(() => {
    // keep in sync with .backdrop-viewport top offset in globals.css
    const HEADER_OFFSET = 60;
    const measure = () => {
      // the layer is (100lvh - header) tall — recover the stable lvh from it
      const lvh = layerRef.current
        ? layerRef.current.offsetHeight + HEADER_OFFSET
        : window.innerHeight;
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

  // resolved before the first client commit, so the Canvas mounts once with
  // the right settings instead of switching from desktop to mobile
  const isMobile = useSyncExternalStore(subscribeMobile, isMobileSnapshot, () => false);
  // phones have no room to pan the drawing aside, so only desktop follows the layout
  const ui = useSyncExternalStore(subscribeUi, readUi, () => "sheets" as const);
  const pan = isMobile ? 0 : UI_PAN[ui] * (rtl ? -1 : 1);

  // null during SSR / hydration; false -> 2D schematic fallback
  const webgl = useSyncExternalStore(noopSubscribe, detectWebGL, () => null);

  const p = reducedMotion ? staticProgress : progress;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="backdrop-viewport fixed inset-x-0 -z-10 flex justify-center overflow-hidden"
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
      {webgl === false ? (
        <ElevatorSchematic
          progress={p}
          explode={isMobile ? 0.35 : 1}
          showAnnotations={!isMobile}
        />
      ) : webgl ? (
        <ElevatorScene
          progress={p}
          explode={isMobile ? 0.35 : 1}
          annotations={!isMobile}
          mobile={isMobile}
          pan={pan}
        />
      ) : null}
    </div>
  );
}
