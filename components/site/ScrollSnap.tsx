"use client";

import { useEffect } from "react";
import { STOPS } from "@/components/elevator3d/tour";
import { getRide, rideTo, setHold } from "@/lib/ride";

/**
 * Stops a fling at the next plate. The page must never coast past it, so the
 * momentum is taken over the moment it starts — on a phone when the finger
 * leaves the glass, on a desktop as soon as a wheel burst turns out to be
 * fast — the remaining distance is eased into the next stop, and the page is
 * then held there for as long as the momentum keeps pushing. A fixed timeout
 * would not do: a hard fling coasts for seconds, and the page would be caught
 * a second time and land a plate further on than the visitor asked for.
 *
 * Deliberate scrolling is untouched: a wheel notch at a time, a slow swipe or
 * a drag of the scrollbar behaves exactly as the browser intends and can come
 * to rest anywhere between the plates. A hand back on the wheel or a finger
 * back on the glass ends the hold at once. Only a genuine fling is caught, and
 * only while the camera tour is running.
 */

const CATCH_MS = 520; // easing into the stop a fling was caught before
const QUIET = 220; // ms without a scroll event: one gesture has ended
const STILL = 220; // ms without the page being pushed off the stop: momentum spent
const HOLD_MAX = 1400; // ms the page can be held before the visitor gets it back
const PUSHES = 4; // notches during a hold that mean a hand is back on the wheel
const FAST = 1.1; // px/ms over the gesture that counts as a fling
const MIN_TRAVEL = 380; // px it has to have covered before that means a fling
const MIN_EVENTS = 2; // a single jump is not a fling: inertia arrives as a stream

export default function ScrollSnap() {
  useEffect(() => {
    let prev = window.scrollY;
    let last = 0;
    let events = 0;
    let startY = 0;
    let startT = 0;
    let touching = false;
    let held: number | null = null; // the stop the page is being kept at
    let heldAt = 0;
    let pushedAt = 0;
    let frame = 0;
    let lastWheel = 0;
    let growing = 0;
    let notches = 0;
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
      held = null;
      setHold(null);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    /**
     * Keeps the page on the stop while the browser is still applying inertia,
     * and lets go by itself the moment nothing is pushing any more, so a
     * visitor scrolling on purpose is never held back for long.
     *
     * What counts as "still pushing" is the drift measured here, not the
     * scroll event: pulling the page back within the same frame cancels the
     * movement, and the browser then fires no scroll event at all — holding
     * the page would silence the very signal that says to keep holding it.
     */
    const hold = () => {
      frame = 0;
      if (held === null) return;
      const now = performance.now();
      const drift = window.scrollY - held;
      if (Math.abs(drift) > 1) {
        pushedAt = now;
        // while the catching ride is still easing in it owns the position
        if (!getRide().active) window.scrollTo({ top: held, behavior: "instant" });
      }
      // once the ride has landed, the drawing reads the stop rather than the
      // scroll offset, so the tug-of-war with the inertia stays invisible
      if (!getRide().active) setHold(held / range());
      if (now - heldAt > HOLD_MAX || now - pushedAt > STILL) {
        held = null;
        setHold(null);
        return;
      }
      frame = requestAnimationFrame(hold);
    };

    /** take the momentum over before it can carry the page past a plate */
    const catchFling = (dir: number) => {
      const now = performance.now();
      if (!engraved() || getRide().active || now - mounted < 600) return;
      const target = beyond(window.scrollY, dir);
      if (target === null) return;
      events = 0;
      held = target;
      heldAt = now;
      notches = 0;
      pushedAt = now;
      last = now;
      // the ride re-asserts the scroll position every frame, which is what
      // overrides the inertia the browser is still applying
      rideTo(target, { ms: CATCH_MS, ignoreWheel: true });
      if (!frame) frame = requestAnimationFrame(hold);
    };

    const onScroll = () => {
      const y = window.scrollY;
      const now = performance.now();
      // a new gesture starts whenever the stream of scroll events breaks; that
      // break is also what tells us the momentum of the last one has died
      if (now - last > QUIET) {
        events = 0;
        startY = prev;
        startT = now;
        release();
      }
      events++;
      last = now;
      const dir = Math.sign(y - prev);
      prev = y;

      if (!engraved()) {
        release();
        return;
      }
      // being held on a stop, or riding to one: nothing to decide
      if (held !== null || getRide().active) return;
      // while a finger is down the visitor is in charge; the fling is caught
      // when it lifts
      if (touching || dir === 0 || events < MIN_EVENTS) return;
      const travel = Math.abs(y - startY);
      if (travel >= MIN_TRAVEL && travel / Math.max(now - startT, 1) >= FAST) catchFling(dir);
    };

    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaY);
      // inertia only ever decays. A hand back on the wheel pushes the notches
      // up again — two in a row, so that a single noisy spike in the tail of a
      // fling does not hand the page back mid-catch.
      growing = d > lastWheel * 1.2 + 2 ? growing + 1 : 0;
      // A ramp means a hand is back on the wheel — but so does simply going on
      // turning it, which inertia never does. Either way the page is theirs.
      if (held !== null && (growing >= 2 || ++notches >= PUSHES)) release();
      lastWheel = d;
    };

    const onTouchStart = () => {
      touching = true;
      release();
      events = 0;
      growing = 0;
      notches = 0;
      startY = window.scrollY;
      startT = performance.now();
    };
    const onTouchEnd = () => {
      touching = false;
      const now = performance.now();
      const dy = window.scrollY - startY;
      // a flick: a good distance covered quickly just before letting go
      if (Math.abs(dy) > 24 && Math.abs(dy) / Math.max(now - startT, 1) >= FAST * 0.5) {
        catchFling(Math.sign(dy));
      }
      prev = window.scrollY;
      last = now;
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
