"use client";

import { useEffect } from "react";
import { STOPS } from "@/components/elevator3d/tour";
import { getRide, rideTo } from "@/lib/ride";

/**
 * Keeps the page on the camera's stops. A flick used to send the page coasting
 * past several plates; now the first stop it crosses catches it — the moment
 * the scroll passes the next stop in the direction of travel, the inertia is
 * taken over and the last pixels are eased out. Coming to rest anywhere else
 * (a slow scroll that stops between plates) settles onto the nearest one.
 *
 * Only runs while the camera tour is on: without WebGL, or with reduced
 * motion, the page scrolls exactly as the browser intends.
 */

const CATCH_MS = 420; // easing out of a caught fling
const SETTLE_MS = 520; // easing onto the nearest stop after a slow scroll
const IDLE = 140; // quiet time that counts as "the visitor stopped"

export default function ScrollSnap() {
  useEffect(() => {
    let anchor: number | null = null;
    let prev = window.scrollY;
    let idle = 0;
    // a fling arrives as a stream of scroll events; a single jump (a scrollbar
    // drag, End, a restored position) is left alone and only settles afterwards
    let streak = 0;
    let last = 0;
    const mounted = performance.now();

    const range = () => Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const stopY = (i: number) => STOPS[Math.min(Math.max(i, 0), STOPS.length - 1)].p * range();
    const nearest = (y: number) => {
      let best = 0;
      for (let i = 1; i < STOPS.length; i++) {
        if (Math.abs(stopY(i) - y) < Math.abs(stopY(best) - y)) best = i;
      }
      return best;
    };

    const onScroll = () => {
      if (document.documentElement.dataset.ui !== "engraved") return;
      const y = window.scrollY;
      if (getRide().active) {
        prev = y;
        anchor = null;
        return;
      }
      const now = performance.now();
      streak = now - last < 200 ? streak + 1 : 1;
      last = now;
      const dir = Math.sign(y - prev);
      if (anchor === null) anchor = nearest(prev);
      if (dir !== 0 && streak >= 3 && now - mounted > 600) {
        const limit = stopY(anchor + dir);
        // crossed the next stop: take the inertia over and ease to a halt
        if (dir > 0 ? y > limit : y < limit) {
          anchor = null;
          prev = y;
          clearTimeout(idle);
          rideTo(limit, { ms: CATCH_MS, ignoreWheel: true });
          return;
        }
      }
      prev = y;
      clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (getRide().active || document.documentElement.dataset.ui !== "engraved") return;
        const target = stopY(nearest(window.scrollY));
        anchor = null;
        if (Math.abs(target - window.scrollY) > 4) rideTo(target, { ms: SETTLE_MS, ignoreWheel: true });
      }, IDLE);
    };

    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      clearTimeout(idle);
    };
  }, []);

  return null;
}
