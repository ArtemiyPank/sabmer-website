"use client";

import { RIDE } from "@/lib/tuning";

/**
 * The trip the page takes when a floor button is pressed.
 *
 * It moves the way the car in the drawing does: a soft start, a run whose
 * length grows with the distance, and a soft landing. The browser's own
 * `behavior: "smooth"` takes roughly the same short time whatever the trip, so
 * jumping four floors would race the camera through every stop of the tour.
 *
 * A trip is cancelled the moment the visitor scrolls themselves.
 */

let frame = 0;
let unbind: (() => void) | null = null;

/**
 * Published so the 3D camera can fly straight to the destination while a trip
 * is running, instead of walking through every stop the page scrolls past.
 * `to` is the destination as scroll progress and `t` the eased progress of the
 * trip itself — the same curve the page is moving on. `id` counts the trips so
 * the camera can tell a new one from the one it is already flying: two presses
 * in a row need not render a frame in between.
 */
export type Ride = { active: boolean; t: number; to: number; id: number };
const ride: Ride = { active: false, t: 0, to: 0, id: 0 };
export const getRide = (): Ride => ride;

/**
 * The progress the drawing should read instead of the scroll position, or null
 * to read the scroll as usual.
 *
 * `components/site/ScrollSnap.tsx` sets it while it is pinning a landing: the
 * browser's own fling can still be running then and nudging the page off the
 * plate a pixel at a time, and that tug-of-war has no business reaching the
 * camera.
 */
const holdAt = { p: null as number | null };
export const getHold = (): number | null => holdAt.p;
export const setHold = (p: number | null) => {
  holdAt.p = p;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** ms for a trip of `distance` pixels: unhurried, but not slow */
const duration = (distance: number) =>
  Math.min(RIDE.maxMs, RIDE.baseMs + distance * RIDE.msPerPx);

function cancel() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  ride.active = false;
  unbind?.();
  unbind = null;
}

/**
 * Ride to a scroll progress. Navigation aims at the camera's stops rather than
 * at the top of a section: the tour parks on a plate at a precise progress, and
 * landing anywhere else leaves the camera mid-flight.
 */
export function rideToProgress(p: number) {
  const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const top = Math.min(Math.max(p, 0), 1) * max;

  cancel();
  const start = window.scrollY;
  const delta = Math.round(top) - start;
  if (Math.abs(delta) < 2) return;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: start + delta, behavior: "instant" });
    return;
  }

  const ms = duration(Math.abs(delta));
  const t0 = performance.now();
  ride.to = Math.min(Math.max((start + delta) / max, 0), 1);
  ride.t = 0;
  ride.id += 1;
  ride.active = true;

  // the visitor takes over the moment they touch the page themselves
  const interrupt = () => cancel();
  addEventListener("wheel", interrupt, { passive: true });
  addEventListener("touchstart", interrupt, { passive: true });
  addEventListener("keydown", interrupt);
  unbind = () => {
    removeEventListener("wheel", interrupt);
    removeEventListener("touchstart", interrupt);
    removeEventListener("keydown", interrupt);
  };

  const step = (now: number) => {
    const t = Math.min((now - t0) / ms, 1);
    ride.t = easeInOutCubic(t);
    // "instant" matters: the page sets scroll-behavior: smooth, which would
    // otherwise animate every step of this animation
    window.scrollTo({ top: start + delta * ride.t, behavior: "instant" });
    if (t < 1) frame = requestAnimationFrame(step);
    else cancel();
  };
  frame = requestAnimationFrame(step);
}
