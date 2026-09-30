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

/** the same ceiling the drawing is held to, on whichever device this is */
const ratedSpeed = () =>
  matchMedia(DRAWING.mobileQuery).matches ? DRAWING.topSpeed.mobile : DRAWING.topSpeed.desktop;

/**
 * ms for a flight covering `dp` of the tour: the time the machine needs at its
 * rated speed, held between the two ends in RIDE — a trip across the whole
 * tour may not be a wait.
 */
const duration = (dp: number) =>
  Math.min(Math.max(Math.abs(dp) / ratedSpeed(), RIDE.minMs), RIDE.maxMs);

/**
 * The trip to a plate the camera reaches along the tour: a soft start, a run
 * at the rated speed, a soft stop — the way the car in the drawing moves, and
 * the way the page moves when it is scrolled there.
 *
 * It used to be a single ease-in-out over the time the distance would take at
 * the rated speed. That has the right average and three times the speed in
 * the middle, so pressing a floor button swept the camera through the leg
 * nearly three times faster at its height than scrolling the same leg does —
 * from Founders back to Reviews the picture turned at 256°/s where scrolling
 * turns it at 122°/s. Now the run is at the rated speed itself, and the only
 * difference from scrolling there is the half-second either end.
 *
 * A trip too short to get up to speed makes do with a lower one.
 */
function liftProfile(dp: number) {
  const D = Math.abs(dp);
  const R = RIDE.rampMs;
  const reach = D >= ratedSpeed() * R;
  const v = reach ? ratedSpeed() : D / R;
  const ms = reach ? D / v + R : 2 * R;
  // distance covered while the speed eases up along smoothstep: its integral
  const S = (x: number) => x * x * x - (x * x * x * x) / 2;
  const at = (t: number) => {
    const now = t * ms;
    const d =
      now <= R ? v * R * S(now / R)
      : now >= ms - R ? D - v * R * S((ms - now) / R)
      : v * R * 0.5 + v * (now - R);
    return D > 0 ? Math.min(Math.max(d / D, 0), 1) : 1;
  };
  return { ms, ease: at };
}

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

  const to = Math.min(Math.max((start + delta) / max, 0), 1);
  const flying = flies(start / max, to);
  // A flight leaves the tour for one sweep out and back in, and keeps the
  // ease-in-out that shapes it; a trip along the tour moves like the car.
  const { ms, ease } = flying
    ? { ms: duration(delta / max), ease: easeInOutCubic }
    : liftProfile(delta / max);
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

  // A frame the browser was too busy to deliver is not paid for in one lurch
  // (the same rule the drawing's governor keeps): the trip advances by at most
  // a few frames' worth of time per frame. Otherwise a stall — the scene
  // compiling what it is about to show, fonts landing and the plates being
  // lettered again — would let the trip jump ahead by however long it lasted,
  // and the camera with it.
  let elapsed = 0;
  let last = 0;
  const step = (now: number) => {
    elapsed += Math.min(now - (last || now), 48);
    last = now;
    const t = Math.min(elapsed / ms, 1);
    const eased = ease(t);
    if (flying) ride.t = eased;
    // "instant" matters: the page sets scroll-behavior: smooth, which would
    // otherwise animate every step of this animation
    window.scrollTo({ top: start + delta * eased, behavior: "instant" });
    if (t < 1) frame = requestAnimationFrame(step);
    else cancel();
  };
  frame = requestAnimationFrame(step);
}
