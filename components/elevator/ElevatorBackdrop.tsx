"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import {
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import ElevatorSchematic from "./ElevatorSchematic";
import { getHold, getRide, setBehind } from "@/lib/ride";
import { DRAWING } from "@/lib/tuning";
import type { SiteNotes } from "@/lib/site-notes";

// three.js + the scene are loaded on the client only, after hydration
const ElevatorScene = dynamic(() => import("../elevator3d/ElevatorScene"), {
  ssr: false,
});

let webglSupport: boolean | null = null;
function detectWebGL() {
  if (webglSupport === null) {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      webglSupport = !!gl;
      // a browser keeps only a handful of contexts alive at once, and this one
      // has done its job the moment it exists: hand it straight back, or the
      // scene below is drawing with one fewer than it could have had
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noopSubscribe = () => () => {};

const MOBILE_QUERY = DRAWING.mobileQuery;
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
 * - prefers-reduced-motion: static assembled scene (progress stays 0)
 * - mobile (<768px): car still travels, exploded view reduced, no callouts,
 *   no shadows
 */
/**
 * A follower with a rated speed.
 *
 * It closes on its target the way anything settling does — quickly while it is
 * far off, easing as it arrives, so neither end of a move has a corner in it —
 * except that it may never travel faster than `topSpeed`, whatever it is
 * handed. That ceiling is the whole point: a trackpad flick moves the scroll a
 * thousand pixels in a sixth of a second, and without one the machine crosses
 * a whole flight of the tour in that same sixth of a second. With one, a small
 * move still follows at once (it is nowhere near the ceiling) and a thrown one
 * becomes a flight of a length the machine chooses.
 *
 * The ceiling is lifted while a floor button's trip is running. It is there to
 * tame an input nobody can govern — a trackpad's notches are accelerated by
 * the system and arrive at whatever speed they arrive at — and a trip is not
 * that: it is the page moving itself along a curve of its own choosing, at a
 * pace already set to this very speed (see `duration` in lib/ride.ts). Holding
 * it back there only starves it: the page would arrive at the far plate while
 * the machine was still crawling towards it, seconds behind and with nothing
 * left driving it but the shortfall.
 *
 * It sleeps when it has arrived and the scroll wakes it, so a page nobody is
 * touching asks for no frames.
 */
function useGoverned(source: MotionValue<number>, tau: number, topSpeed: number, rest: number) {
  const out = useMotionValue(source.get());
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      // a frame the browser was too busy to deliver must not be paid for in
      // one lurch: the machine moves at most a frame's worth of distance
      const dt = Math.min(now - (last || now), 64);
      last = now;
      const want = source.get();
      const d = want - out.get();
      if (Math.abs(d) < rest) {
        out.set(want);
        setBehind(0);
        frame = 0;
        last = 0;
        return;
      }
      setBehind(Math.abs(d));
      if (getRide().running) {
        // the page is animating itself: follow it exactly
        out.set(want);
      } else {
        const v = Math.max(Math.min(d / tau, topSpeed), -topSpeed);
        out.set(out.get() + v * dt);
      }
      frame = requestAnimationFrame(step);
    };
    const wake = () => {
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(step);
      }
    };
    const stop = source.on("change", wake);
    wake();
    return () => {
      stop();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [source, tau, topSpeed, rest, out]);
  return out;
}

export default function ElevatorBackdrop({ notes }: { notes: SiteNotes }) {
  const { scrollY } = useScroll();
  const reducedMotion = useReducedMotion();
  const staticProgress = useMotionValue(0);

  const layerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef(1);
  const target = useTransform(scrollY, (v) => {
    // while a caught fling is being held on its plate the stop is the truth,
    // not the scroll offset the momentum keeps nudging
    const held = getHold();
    return held ?? Math.min(Math.max(v / rangeRef.current, 0), 1);
  });

  // resolved before the first client commit, so the Canvas mounts once with
  // the right settings instead of switching from desktop to mobile
  const isMobile = useSyncExternalStore(subscribeMobile, isMobileSnapshot, () => false);

  /**
   * The drawing follows the scroll rather than being pinned to it, and never
   * moves faster than the machine's rated speed — which a phone is given more
   * of, because a finger on the glass is direct in a way a trackpad is not.
   * See `useGoverned` above and DRAWING in lib/tuning.ts.
   */
  const smoothed = useGoverned(
    target,
    DRAWING.follow,
    isMobile ? DRAWING.topSpeed.mobile : DRAWING.topSpeed.desktop,
    DRAWING.rest
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

  // null during SSR / hydration; false -> 2D schematic fallback
  const webgl = useSyncExternalStore(noopSubscribe, detectWebGL, () => null);

  const p = reducedMotion ? staticProgress : smoothed;

  // The scene letters the page copy onto the parts and flies the camera from
  // one to the next, which replaces the flow sections. They are therefore only
  // hidden while it actually runs: without WebGL, or with reduced motion (the
  // tour never advances), the page shows its own text instead.
  const tour = webgl === true && !reducedMotion;
  useEffect(() => {
    const el = document.documentElement;
    if (tour) el.dataset.ui = "engraved";
    else delete el.dataset.ui;
  }, [tour]);

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
          explode={0}
          showAnnotations={!isMobile}
        />
      ) : webgl ? (
        <ElevatorScene
          progress={p}
          explode={0}
          annotations={false}
          mobile={isMobile}
          notes={notes}
        />
      ) : null}
    </div>
  );
}
