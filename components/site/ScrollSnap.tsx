"use client";

import { useEffect } from "react";
import { STOPS } from "@/components/elevator3d/tour";
import { easeGentle, getRide, rideTo, setHold } from "@/lib/ride";

/**
 * Keeps the page's own momentum from carrying it past a plate.
 *
 * It does not ask whether a gesture "was a fling". While a finger is on the
 * glass — or a hand is still working the wheel — the page is the visitor's and
 * nothing here touches it, however far or fast they drag. Only once the page
 * is coasting on its own does this watch it, and then it asks one question on
 * every frame: at this speed, would it come to rest beyond the next plate? If
 * it would, the remaining distance is eased into that plate instead. If the
 * coast would run out before reaching it, the page is left alone and comes to
 * rest between the plates, which is a perfectly good place to be.
 */

/**
 * How far ahead the current speed is projected, in ms. A browser's fling
 * decays roughly exponentially over about this long, so `speed × LOOKAHEAD` is
 * a fair estimate of the ground it still has left to cover.
 */
const LOOKAHEAD = 380;
/** px/ms below which the page is as good as stopped */
const MIN_SPEED = 0.09;
/** ms after a wheel notch that did not fade: a hand is still on it */
const HAND = 140;
/** ms of stillness that ends the watch */
const IDLE = 260;
/** ms without the page being pushed off a stop: the momentum is spent */
const STILL = 340;
/** ms from the catch before the visitor gets the page back regardless */
const HOLD_MAX = 2800;
/** ms after a hold before anything may be caught again */
const REARM = 260;

export default function ScrollSnap() {
  useEffect(() => {
    let touching = false;
    let handAt = 0;
    let lastWheel = 0;

    let frame = 0;
    let seenY = window.scrollY;
    let seenT = 0;
    let movedAt = 0;
    let speed = 0; // px/ms, smoothed, signed

    let held: number | null = null;
    let heldAt = 0;
    let pushedAt = 0;
    let holdFrame = 0;
    let armedAt = 0;
    const mounted = performance.now();

    const range = () => Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const stopY = (i: number) => STOPS[i].p * range();
    /** the first stop the page would pass travelling in `dir` from `y` */
    const beyond = (y: number, dir: number) => {
      if (dir > 0) {
        for (let i = 0; i < STOPS.length; i++) if (stopY(i) > y + 8) return stopY(i);
        return null;
      }
      for (let i = STOPS.length - 1; i >= 0; i--) if (stopY(i) < y - 8) return stopY(i);
      return null;
    };
    const engraved = () => document.documentElement.dataset.ui === "engraved";

    const release = () => {
      if (held !== null) armedAt = performance.now();
      held = null;
      setHold(null);
      if (holdFrame) cancelAnimationFrame(holdFrame);
      holdFrame = 0;
    };

    /** keeps the page on the plate while the last of the momentum dies away */
    const hold = () => {
      holdFrame = 0;
      if (held === null) return;
      const now = performance.now();
      if (Math.abs(window.scrollY - held) > 1) {
        pushedAt = now;
        if (!getRide().active) window.scrollTo({ top: held, behavior: "instant" });
      }
      // the drawing reads the stop rather than the contested scroll offset
      if (!getRide().active) setHold(held / range());
      if (now - heldAt > HOLD_MAX || now - pushedAt > STILL) {
        held = null;
        setHold(null);
        armedAt = now;
        return;
      }
      holdFrame = requestAnimationFrame(hold);
    };

    /**
     * Watches the page while it is coasting. `free` is the visitor's own
     * doing — a finger down, or a hand still turning the wheel — and while it
     * is true nothing is measured against the plates at all.
     */
    const watch = () => {
      frame = 0;
      const now = performance.now();
      const y = window.scrollY;
      const dt = Math.max(now - seenT, 1);
      const step = y - seenY;
      seenY = y;
      seenT = now;
      if (Math.abs(step) > 0.5) movedAt = now;
      // a little smoothing: one jittery frame should not decide anything
      speed = speed * 0.55 + (step / dt) * 0.45;

      const free = touching || now - handAt < HAND;
      const fast = Math.abs(speed);
      const dir = Math.sign(speed);

      if (
        !free &&
        dir !== 0 &&
        fast > MIN_SPEED &&
        held === null &&
        !getRide().active &&
        engraved() &&
        now - mounted > 600 &&
        now - armedAt > REARM
      ) {
        const target = beyond(y, dir);
        if (target !== null && Math.abs(target - y) < fast * LOOKAHEAD) {
          // left alone the coast would end past this plate: land it there,
          // over roughly the time it would have taken to get there anyway
          const ms = Math.min(Math.max((Math.abs(target - y) / fast) * 1.7, 260), 900);
          held = target;
          heldAt = now;
          pushedAt = now;
          rideTo(target, { ms, ignoreWheel: true, ease: easeGentle, direct: false });
          if (!holdFrame) holdFrame = requestAnimationFrame(hold);
          return;
        }
      }

      if (now - movedAt < IDLE) frame = requestAnimationFrame(watch);
      else speed = 0;
    };

    const startWatch = () => {
      const now = performance.now();
      movedAt = now;
      if (frame) return;
      seenY = window.scrollY;
      seenT = now;
      frame = requestAnimationFrame(watch);
    };

    const onScroll = () => startWatch();

    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaY);
      // momentum only ever fades; a notch that holds its size or grows is a
      // hand still on the wheel, and the page stays entirely theirs
      if (d >= lastWheel) handAt = performance.now();
      lastWheel = d;
      startWatch();
    };

    const onTouchStart = () => {
      touching = true;
      release();
      speed = 0;
      startWatch();
    };
    const onTouchEnd = () => {
      touching = false;
      lastWheel = 0;
      startWatch();
    };
    const onKeyDown = () => release();

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    addEventListener("touchcancel", onTouchEnd, { passive: true });
    addEventListener("keydown", onKeyDown);
    return () => {
      release();
      if (frame) cancelAnimationFrame(frame);
      removeEventListener("scroll", onScroll);
      removeEventListener("wheel", onWheel);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchend", onTouchEnd);
      removeEventListener("touchcancel", onTouchEnd);
      removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
