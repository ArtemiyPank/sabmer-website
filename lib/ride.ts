"use client";

import { STOPS } from "@/components/elevator3d/tour";
import { DRAWING, RIDE } from "@/lib/tuning";

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
 * The trip in progress, published for the two parts that need to know.
 *
 * `running` is any trip at all: the page is being moved by something other
 * than the visitor, and nothing else should take the wheel. `flying` is the
 * narrower case where the camera leaves the tour and goes straight to the
 * destination, which is only worth doing when the trip would otherwise race
 * through a stop on the way (see `flies`). `to` is the destination as scroll
 * progress and `t` the eased progress of the trip — the same curve the page is
 * moving on. `id` counts the flights so the camera can tell a new one from the
 * one it is already flying: two presses in a row need not render a frame in
 * between.
 */
export type Ride = { running: boolean; flying: boolean; t: number; to: number; id: number };
const ride: Ride = { running: false, flying: false, t: 0, to: 0, id: 0 };
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

/**
 * How far the machine still has to travel to be where the page is, in units of
 * scroll progress. Zero when it has arrived.
 *
 * The drawing has a rated speed and the scroll does not, so after a flick the
 * page is at the next plate long before the machine is. Anything that wants to
 * know whether the journey is over has to ask the drawing, not the scroll —
 * `components/site/ScrollSnap.tsx` asks so that a second flick thrown at a
 * machine still in motion does not simply queue another journey behind the
 * one playing.
 */
const behind = { p: 0 };
export const getBehind = (): number => behind.p;
export const setBehind = (p: number) => {
  behind.p = p;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Whether the camera should fly the trip instead of simply following the page.
 *
 * The flight exists for one reason: a trip of several floors would otherwise
 * race the camera through every stop between here and there. A trip that
 * passes none — the next floor along, or a nudge back onto the plate the page
 * is already on — has nothing to skip, so the camera keeps to the tour and the
 * scene simply plays backwards or forwards. Flying such a short trip swings
 * the camera out and back for no reason: it reads as the machine backing away
 * from the visitor before answering them.
 */
function flies(from: number, to: number) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const clear = 0.002; // a stop at either end is not one passed on the way
  return STOPS.some((s) => s.p > lo + clear && s.p < hi - clear);
}

/**
 * ms for a trip covering `dp` of the tour: the time the machine needs at its
 * rated speed, so that a button press and a flick to the same plate are the
 * same journey. Held between the two ends in RIDE — a trip to the next plate
 * along may not be instant, and one across the whole tour may not be a wait.
 */
const duration = (dp: number) => {
  // the same ceiling the drawing is held to, so a button and a flick to the
  // same plate take the same time on whichever device is being used
  const speed = matchMedia(DRAWING.mobileQuery).matches
    ? DRAWING.topSpeed.mobile
    : DRAWING.topSpeed.desktop;
  return Math.min(Math.max(Math.abs(dp) / speed, RIDE.minMs), RIDE.maxMs);
};

function cancel() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  ride.running = false;
  ride.flying = false;
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

  const ms = duration(delta / max);
  const t0 = performance.now();
  const to = Math.min(Math.max((start + delta) / max, 0), 1);
  const flying = flies(start / max, to);
  ride.running = true;
  if (flying) {
    ride.to = to;
    ride.t = 0;
    ride.id += 1;
    ride.flying = true;
  }

  /**
   * The visitor takes over the moment they touch the page themselves — but
   * only when they actually do. A wheel event carrying no distance is the tail
   * of a fling the browser has already given up on (the same one
   * `components/site/ScrollSnap.tsx` ignores), and a key that does not scroll
   * is not a hand on the page: either one cancelling the trip would strand the
   * camera exactly where the trip was taking it away from.
   */
  const SCROLLS = new Set([
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "PageUp", "PageDown", "Home", "End", " ", "Spacebar",
  ]);
  const interrupt = (e: Event) => {
    if (e.type === "wheel" && (e as WheelEvent).deltaY === 0) return;
    if (e.type === "keydown" && !SCROLLS.has((e as KeyboardEvent).key)) return;
    cancel();
  };
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
    const eased = easeInOutCubic(t);
    if (flying) ride.t = eased;
    // "instant" matters: the page sets scroll-behavior: smooth, which would
    // otherwise animate every step of this animation
    window.scrollTo({ top: start + delta * eased, behavior: "instant" });
    if (t < 1) frame = requestAnimationFrame(step);
    else cancel();
  };
  frame = requestAnimationFrame(step);
}
