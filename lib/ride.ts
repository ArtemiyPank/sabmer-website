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

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** ms for a trip of `distance` pixels: about a second per screenful, capped */
function duration(distance: number) {
  return Math.min(2800, 620 + distance * 0.55);
}

export function cancelRide() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  stop?.();
  stop = null;
}

/** animate the window scroll to `top` */
export function rideTo(top: number) {
  cancelRide();
  const start = window.scrollY;
  const delta = Math.round(top) - start;
  if (Math.abs(delta) < 2) return;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: start + delta, behavior: "instant" });
    return;
  }

  const ms = duration(Math.abs(delta));
  const t0 = performance.now();
  const interrupt = () => cancelRide();
  // the visitor takes over the moment they touch the page themselves
  addEventListener("wheel", interrupt, { passive: true });
  addEventListener("touchstart", interrupt, { passive: true });
  addEventListener("keydown", interrupt);
  stop = () => {
    removeEventListener("wheel", interrupt);
    removeEventListener("touchstart", interrupt);
    removeEventListener("keydown", interrupt);
  };

  const step = (now: number) => {
    const t = Math.min((now - t0) / ms, 1);
    // "instant" matters: the page sets scroll-behavior: smooth, which would
    // otherwise animate every step of this animation
    window.scrollTo({ top: start + delta * easeInOutCubic(t), behavior: "instant" });
    if (t < 1) frame = requestAnimationFrame(step);
    else cancelRide();
  };
  frame = requestAnimationFrame(step);
}

/** ride to the top of the element with this id (used by the header nav) */
export function rideToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const header = 60;
  rideTo(Math.max(el.getBoundingClientRect().top + window.scrollY - header, 0));
}
