"use client";

/**
 * Scrolls the page the way the car in the drawing moves: a soft start, a run
 * whose length grows with the distance, and a soft landing. The browser's own
 * `behavior: "smooth"` takes roughly the same short time whatever the trip, so
 * jumping four floors would race the camera through every stop of the tour.
 *
 * A ride is cancelled as soon as the visitor scrolls themselves.
 */

let frame = 0;
let stop: (() => void) | null = null;

/**
 * Published so the 3D camera can fly straight to the destination while a ride
 * is running, instead of walking through every stop the page scrolls past.
 * `to` is the destination as scroll progress, `t` the eased progress of the
 * ride itself — the same curve the page is moving on, and `id` counts the
 * rides so the camera can tell a new one from the one it is already flying
 * (two presses in a row need not render a frame in between).
 */
export type Ride = { active: boolean; t: number; to: number; id: number };
const ride: Ride = { active: false, t: 0, to: 0, id: 0 };
export const getRide = (): Ride => ride;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** ms for a trip of `distance` pixels: an unhurried ride, but not a slow one */
function duration(distance: number) {
  return Math.min(3000, 700 + distance * 0.62);
}

export function cancelRide() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  ride.active = false;
  stop?.();
  stop = null;
}

/**
 * Animate the window scroll to `top`.
 *  - `ms` overrides the distance-based duration (snapping uses a short one)
 *  - `ignoreWheel` keeps the ride alive through the tail of a trackpad fling,
 *    which keeps firing wheel events after the fingers have left
 */
export function rideTo(top: number, opts?: { ms?: number; ignoreWheel?: boolean }) {
  cancelRide();
  const start = window.scrollY;
  const delta = Math.round(top) - start;
  if (Math.abs(delta) < 2) return;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: start + delta, behavior: "instant" });
    return;
  }

  const ms = opts?.ms ?? duration(Math.abs(delta));
  const t0 = performance.now();
  const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  ride.to = Math.min(Math.max((start + delta) / max, 0), 1);
  ride.t = 0;
  ride.id += 1;
  ride.active = true;
  const interrupt = () => cancelRide();
  // the visitor takes over the moment they touch the page themselves
  if (!opts?.ignoreWheel) addEventListener("wheel", interrupt, { passive: true });
  addEventListener("touchstart", interrupt, { passive: true });
  addEventListener("keydown", interrupt);
  stop = () => {
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
    else cancelRide();
  };
  frame = requestAnimationFrame(step);
}

/**
 * Ride to a scroll progress. Navigation aims at the camera's stops rather
 * than at the top of a section: the tour parks on a plate at a precise
 * progress, and landing anywhere else leaves the camera mid-flight.
 */
export function rideToProgress(p: number) {
  const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  rideTo(Math.min(Math.max(p, 0), 1) * max);
}
