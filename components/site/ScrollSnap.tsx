"use client";

import { useEffect } from "react";
import { STOPS, refuge } from "@/components/elevator3d/tour";
import { getRide, rideToProgress, setHold } from "@/lib/ride";
import { COAST } from "@/lib/tuning";
import { probeGesture, probeHandover, probeNotch, probeRest, probing } from "@/lib/scroll-probe";

/**
 * Runs the page's coast itself instead of arguing with the browser's.
 *
 * While the visitor is driving — a finger on the glass, a hand on the wheel —
 * nothing here touches the page. The moment they let go, this takes the
 * momentum over: it measures the speed they left behind, cancels the
 * browser's fling by driving the scroll itself every frame, and carries the
 * page on under a decay of its own. Because the coast is ours, its speed has
 * a ceiling, and where it ends is known before it starts — so it can simply
 * be told to end on the next plate whenever it would otherwise sail past one.
 *
 * A coast too weak to reach the next plate is left exactly as it is. Coming
 * to rest between plates is a perfectly good place to be; the only thing
 * forbidden is crossing one under nobody's hand.
 *
 * The one exception is a stretch of the tour with nothing in it to look at.
 * Wherever the page finally comes to rest — under a coast of ours or a hand
 * of theirs — it asks the tour whether that is somewhere worth being, and
 * rides on to the nearest plate if it is not.
 */

export default function ScrollSnap() {
  useEffect(() => {
    // --- what the visitor is doing -----------------------------------------
    let touching = false;
    let handAt = 0;
    // the wheel gesture being read; see onWheel
    let gestureAt = 0;
    let peak = 0;
    let lastD = 0;
    let fading = 0;
    let handedOver = false;
    let quiet: ReturnType<typeof setTimeout> | null = null;
    /**
     * How fast the wheel is moving the page, px/ms, read from the notches
     * themselves rather than from the scroll position.
     *
     * A notch says how far the page is about to go, which is the speed at the
     * source; the scroll position says where it got to — a number the browser
     * may still be animating, and one a per-frame reading loses whenever two
     * notches land on the same frame or a frame is dropped. On a loaded
     * machine, which is exactly when this matters, that reading collapses to
     * nothing and the page is handed a coast with no speed in it, so it sails
     * on under the browser instead of stopping at the plate.
     */
    let wheelV = 0;
    /** where the page was when the coast was handed over, for the read-out */
    let handoverY = 0;

    // --- reading the speed they leave behind --------------------------------
    let sampleY = window.scrollY;
    let sampleT = 0;
    let observed = 0; // px/ms, smoothed
    let sampler = 0;

    // --- our own coast ------------------------------------------------------
    let coastFrame = 0;
    let cv = 0; // px/ms, signed
    let cy = 0;
    let ctau: number = COAST.tau;
    let ctarget: number | null = null;
    let lastStep = 0;

    // --- holding the plate while the browser's own fling dies ---------------
    let held: number | null = null;
    let heldAt = 0;
    let pushedAt = 0;
    let holdFrame = 0;
    const mounted = performance.now();

    const range = () => Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const maxY = () => range();
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
    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    // ---------------------------------------------------------------- holding
    const releaseHold = () => {
      held = null;
      setHold(null);
      if (holdFrame) cancelAnimationFrame(holdFrame);
      holdFrame = 0;
    };
    /**
     * Our coast can finish while the browser's fling is still running, and the
     * moment we stop writing the scroll it would carry on from wherever its
     * own animation had got to. So the landing is pinned until nothing is
     * pushing the page any more.
     */
    const hold = () => {
      holdFrame = 0;
      if (held === null) return;
      const now = performance.now();
      if (Math.abs(window.scrollY - held) > 1) {
        pushedAt = now;
        window.scrollTo({ top: held, behavior: "instant" });
      }
      setHold(held / range());
      if (now - heldAt > COAST.holdMax || now - pushedAt > COAST.stillFor) {
        releaseHold();
        return;
      }
      holdFrame = requestAnimationFrame(hold);
    };
    const startHold = (at: number) => {
      held = at;
      heldAt = performance.now();
      pushedAt = heldAt;
      if (!holdFrame) holdFrame = requestAnimationFrame(hold);
    };

    // ---------------------------------------------------------------- coasting
    const stopCoast = () => {
      if (coastFrame) cancelAnimationFrame(coastFrame);
      coastFrame = 0;
      cv = 0;
      ctarget = null;
    };

    const coast = () => {
      coastFrame = 0;
      const now = performance.now();
      const dt = clamp(now - lastStep, 1, 48);
      lastStep = now;

      cv *= Math.exp(-dt / ctau);
      cy = clamp(cy + cv * dt, 0, maxY());
      const done =
        Math.abs(cv) < COAST.minSpeed ||
        cy <= 0 ||
        cy >= maxY() ||
        (ctarget !== null && Math.abs(cy - ctarget) < 1);

      if (done && ctarget !== null) cy = ctarget;
      window.scrollTo({ top: cy, behavior: "instant" });

      if (done) {
        const land = ctarget;
        stopCoast();
        // pin the landing so the browser's own fling cannot push it on
        startHold(land ?? cy);
        return;
      }
      coastFrame = requestAnimationFrame(coast);
    };

    /**
     * Takes the momentum over. `v0` is the speed the visitor left behind. The
     * coast is given a decay that lands it exactly on the next plate whenever
     * it would otherwise cross one — same shape of curve either way, only the
     * time constant differs, so nothing about it reads as a snap.
     */
    const startCoast = (v0: number) => {
      if (!engraved() || getRide().running || performance.now() - mounted < 600) return;
      const v = clamp(v0, -COAST.maxSpeed, COAST.maxSpeed);
      if (Math.abs(v) < COAST.throwSpeed) return;
      releaseHold();
      cy = window.scrollY;
      const dir = Math.sign(v);
      const natural = cy + v * COAST.tau; // where it would come to rest, left alone
      const plate = beyond(cy, dir);
      ctarget = null;
      ctau = COAST.tau;
      cv = v;
      if (plate !== null && (dir > 0 ? natural > plate : natural < plate)) {
        const d = Math.abs(plate - cy);
        // land exactly there: distance = speed × decay, so pick the decay
        ctau = clamp(d / Math.abs(v), COAST.tauMin, COAST.tauMax);
        cv = dir * (d / ctau);
        ctarget = plate;
      }
      lastStep = performance.now();
      coastFrame = requestAnimationFrame(coast);
    };

    // ------------------------------------------------------- watching the page
    /** keeps a reading of how fast the page is actually moving */
    const sample = () => {
      sampler = 0;
      const now = performance.now();
      const y = window.scrollY;
      const dt = Math.max(now - sampleT, 1);
      const v = (y - sampleY) / dt;
      observed = observed * 0.5 + v * 0.5;
      sampleY = y;
      sampleT = now;
      if (touching || now - handAt < COAST.handFor) sampler = requestAnimationFrame(sample);
      else observed = observed * 0.5;
    };
    const startSampling = () => {
      if (sampler) return;
      sampleY = window.scrollY;
      sampleT = performance.now();
      sampler = requestAnimationFrame(sample);
    };

    // -------------------------------------------------- where the page settles
    /** is anything still moving the page? */
    const driving = () => touching || getRide().running || coastFrame !== 0 || held !== null;

    /**
     * Nearly all of the tour is worth stopping in, and a little of it is not —
     * the tour itself says which, and where the page belongs instead (see
     * `refuge` in ../elevator3d/tour.ts). The page counts as having come to
     * rest once the scroll has been quiet for a moment and nothing is driving
     * it any more; only then is it taken somewhere worth being, and it gets
     * there on the same unhurried ride as a press of a floor button.
     */
    let restTimer: ReturnType<typeof setTimeout> | null = null;
    const settle = () => {
      restTimer = null;
      // something is still moving it: this is not where it will come to rest
      if (driving()) {
        restTimer = setTimeout(settle, COAST.restMs);
        return;
      }
      if (probing()) {
        const y = window.scrollY;
        const lo = Math.min(handoverY, y);
        const hi = Math.max(handoverY, y);
        const past = STOPS.filter((st) => {
          const p = st.p * range();
          return p > lo + 8 && p < hi - 8;
        }).length;
        probeRest(y, range(), past);
      }
      if (!engraved()) return;
      const to = refuge(window.scrollY / range());
      if (to !== null) rideToProgress(to);
    };
    const onScroll = () => {
      if (restTimer) clearTimeout(restTimer);
      restTimer = setTimeout(settle, COAST.restMs);
    };

    const giveBack = () => {
      stopCoast();
      releaseHold();
    };

    const onTouchStart = () => {
      touching = true;
      giveBack();
      observed = 0;
      startSampling();
    };
    const onTouchEnd = () => {
      touching = false;
      // the reading taken while the finger was moving is the speed it let go at
      startCoast(observed);
      observed = 0;
    };

    /**
     * Reading a wheel gesture, which has no "finger lifted" of its own.
     *
     * A trackpad sends the same kind of event whether a hand is on it or its
     * momentum is running, and while the fingers are still moving the notches
     * wobble — so one notch smaller than the one before it means nothing. The
     * gesture is read as a whole instead: it opens when the events start, the
     * page is the visitor's while the notches are climbing to their peak, and
     * once they have fallen well away from that peak the hand is off and the
     * coast is ours to finish under the plate rule.
     *
     * The handover is decided once per gesture and not taken back, so the page
     * is never passed to and fro inside a single flick — which is what a rule
     * reading each notch against the last one does, and it shows as both
     * stutter and a page that sails past its plate. Only a fresh push, a notch
     * back up near the peak, gives the page to the visitor again.
     */
    const handOver = () => {
      if (handedOver) return;
      handedOver = true;
      probeHandover(wheelV);
      handoverY = window.scrollY;
      startCoast(wheelV);
    };

    const onWheel = (e: WheelEvent) => {
      // the moment the notch happened, not the moment we got round to it: on
      // a loaded machine handlers run late and bunched, and a clock read here
      // would report a gesture shape that never occurred
      const now = e.timeStamp || performance.now();
      const d = Math.abs(e.deltaY);
      const since = now - gestureAt;
      if (since > COAST.gestureGap) {
        // a new gesture: the page is theirs again until it says otherwise
        peak = 0;
        lastD = 0;
        fading = 0;
        wheelV = 0;
        handedOver = false;
        probeGesture(window.scrollY);
        giveBack();
      }
      probeNotch(d);
      // a notch says how far the page is about to travel; that over the time
      // since the last one is the speed the visitor is driving at
      wheelV = wheelV * 0.6 + (e.deltaY / Math.min(Math.max(since, 8), 200)) * 0.4;
      gestureAt = now;
      handAt = now;

      /**
       * Fingers and momentum, told apart by what the notches *do* rather than
       * by how big they are. Momentum only ever decays: every notch a little
       * smaller than the one before, for as long as it runs. Fingers do not —
       * they push, ease, push again, hold steady. So a run of notches each
       * smaller than the last is the hand coming off, and a notch back up is
       * the hand returning.
       *
       * Read this way the handover falls in the first few notches of the
       * momentum, while the page is still moving fast and the next plate is
       * still ahead of it. A rule that waits for the notches to drop below
       * some share of the peak waits out most of the flight instead, and by
       * then several plates have gone by — which is exactly what it did.
       */
      const rising = d > lastD * 1.05;
      const falling = d < lastD * 0.95 || (peak > 0 && d < peak * COAST.fade);
      lastD = d;
      if (d > peak) peak = d;

      if (handedOver) {
        // a real push takes the page back: bigger than the last notch, and
        // not merely two momentum notches the browser delivered as one
        if (rising && d >= peak * COAST.fade) {
          handedOver = false;
          fading = 0;
          giveBack();
        }
      } else {
        if (falling) fading += 1;
        else if (rising) fading = 0;
        if (fading >= COAST.fadeFor && peak >= COAST.wheelPeak) handOver();
      }

      // a gesture that simply stops — a mouse wheel, or a flick too short to
      // show a fade at all — hands over once the wheel has gone quiet
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(handOver, COAST.handFor);
    };

    const onKeyDown = () => giveBack();

    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    addEventListener("touchcancel", onTouchEnd, { passive: true });
    addEventListener("keydown", onKeyDown);
    return () => {
      giveBack();
      if (sampler) cancelAnimationFrame(sampler);
      if (restTimer) clearTimeout(restTimer);
      if (quiet) clearTimeout(quiet);
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
