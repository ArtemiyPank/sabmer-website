"use client";

import { useEffect } from "react";
import { STOPS } from "@/components/elevator3d/tour";
import { getRide, setHold } from "@/lib/ride";
import { COAST } from "@/lib/tuning";

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
 */

export default function ScrollSnap() {
  useEffect(() => {
    // --- what the visitor is doing -----------------------------------------
    let touching = false;
    let handAt = 0;
    let lastWheel = 0;

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
      if (!engraved() || getRide().active || performance.now() - mounted < 600) return;
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
      lastWheel = 0;
      // the reading taken while the finger was moving is the speed it let go at
      startCoast(observed);
      observed = 0;
    };

    const onWheel = (e: WheelEvent) => {
      const d = Math.abs(e.deltaY);
      const now = performance.now();
      if (d >= lastWheel) {
        // a notch that holds its size or grows: a hand is still on the wheel
        if (now - handAt > COAST.handFor) giveBack();
        handAt = now;
        startSampling();
      } else if (coastFrame === 0 && held === null) {
        // the notches are fading — this is the trackpad's momentum, and it is
        // ours to finish
        startCoast(observed);
      }
      lastWheel = d;
    };

    const onKeyDown = () => giveBack();

    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    addEventListener("touchcancel", onTouchEnd, { passive: true });
    addEventListener("keydown", onKeyDown);
    return () => {
      giveBack();
      if (sampler) cancelAnimationFrame(sampler);
      removeEventListener("wheel", onWheel);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchend", onTouchEnd);
      removeEventListener("touchcancel", onTouchEnd);
      removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
