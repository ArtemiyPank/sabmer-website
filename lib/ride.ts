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
 * `from` and `to` are where the trip starts and ends as scroll progress, `t`
 * the eased progress of the ride itself — the same curve the page is moving on, and `id` counts the
 * rides so the camera can tell a new one from the one it is already flying
 * (two presses in a row need not render a frame in between).
 */
export type Ride = { active: boolean; t: number; from: number; to: number; id: number; direct: boolean };
const ride: Ride = { active: false, t: 0, from: 0, to: 0, id: 0, direct: true };
export const getRide = (): Ride => ride;

/**
 * The progress the page is being held at while a caught fling's momentum dies
 * away, or null when nothing is holding it.
 *
 * The page is pulled back onto the stop a frame after the momentum nudges it
 * off, so the raw scroll position twitches by a few pixels for as long as the
 * inertia lasts. Reading progress from here instead keeps that twitch out of
 * the drawing: the camera sits still on the plate while the fight plays out
 * in the scroll offset alone.
 */
const holdAt = { p: null as number | null };
export const getHold = (): number | null => {
  // A caught fling drives the drawing from the ride's own eased clock. The
  // page is being pulled against the browser's momentum for as long as this
  // runs, and reading that tug-of-war into the drawing is what makes a fast
  // swipe look ragged. Button navigation is not included: it flies the camera
  // straight to its destination and never walks this route.
  if (ride.active && !ride.direct) return ride.from + (ride.to - ride.from) * ride.t;
  return holdAt.p;
};
export const setHold = (p: number | null) => {
  holdAt.p = p;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * A gentler in-out than the cubic: it runs at twice the average speed through
 * the middle rather than three times, so a short trip reads as one even move
 * instead of a slow lean followed by a dash. Catching a fling uses it.
 */
export const easeGentle = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

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
 *  - `ease` overrides the curve the trip is paced on
 *  - `direct` (the default) flies the camera straight to the destination
 *    instead of walking it through every stop on the way. Catching a fling
 *    turns it off: that trip only ever goes to the neighbouring plate, so the
 *    camera should swing out around the hoistway exactly as it does when the
 *    page is scrolled there by hand.
 */
export function rideTo(
  top: number,
  opts?: { ms?: number; ignoreWheel?: boolean; ease?: (t: number) => number; direct?: boolean }
) {
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
  ride.from = Math.min(Math.max(start / max, 0), 1);
  ride.to = Math.min(Math.max((start + delta) / max, 0), 1);
  ride.t = 0;
  ride.id += 1;
  ride.direct = opts?.direct ?? true;
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
    ride.t = (opts?.ease ?? easeInOutCubic)(t);
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
