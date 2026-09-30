"use client";

import { useEffect } from "react";
import { getRide, rideToProgress } from "@/lib/ride";
import { onSceneReady } from "@/lib/scene-ready";
import { onLayoutMode } from "@/lib/layout-mode";
import { sectionProgress, STOP_SECTIONS } from "@/components/elevator3d/tour";

/**
 * Bringing the visitor back to where they were after a reload — by flying
 * there, straight, the way a floor button does.
 *
 * Left to the browser, a reload put the page back at its old offset while the
 * machine started from the top, and the machine then caught up at its rated
 * speed along the tour: the cab, the doors, the Work plate and every other
 * stop on the way, one after another, before arriving. And an address with a
 * section in it (#reviews, which the floor buttons leave behind) was worse: the
 * browser scrolled to where that section's card sits in the page's text,
 * which is nowhere near the plate the tour parks on for it — a visitor who
 * reloaded on Reviews woke up beside the Work plate.
 *
 * So the browser is told not to restore anything, and not to jump to the
 * section either (the inline script in the locale layout sees to both before
 * the page is parsed); the page opens at the top, and once the scene has drawn
 * its first frame this rides to where the visitor was — the same trip, the
 * same straight flight past the stops in between, as pressing that floor's
 * button (lib/ride.ts). Where they were is kept per tab and per page, as the
 * browser's own restoration would have been. A fresh visit to an address with
 * a section in it goes to that section's plate the same way.
 *
 * Without the tour — no WebGL, or reduced motion — there is no journey worth
 * showing, and the position is simply put back.
 */

const key = () => `sabmer:scroll:${location.pathname}`;

/**
 * Whether this document has already been placed. Module state survives a
 * client-side navigation — switching the language remounts the page without
 * loading a new document — and only a real load is an arrival: the language
 * switcher keeps the scroll where it is and must not be overridden by a
 * position remembered from some earlier visit to that language.
 */
let placed = false;

/**
 * Whether the browser itself would have put the scroll back: a reload, or
 * back and forward through history. A fresh visit starts at the top — or at
 * the section its address names — even with a remembered position in the tab.
 */
function returning() {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload" || nav?.type === "back_forward";
}

/** where the page is, as scroll progress — or where a trip is taking it */
function progressNow() {
  const ride = getRide();
  if (ride.running) return ride.to;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
}

declare global {
  interface Window {
    /** the section the address named, taken off it before the browser could jump there */
    __arrivalHash?: string;
  }
}

export default function ScrollRestore() {
  useEffect(() => {
    const arriving = !placed;
    placed = true;

    // what the page was reloaded from, if anything
    let saved: number | null = null;
    if (arriving && returning()) {
      try {
        const raw = sessionStorage.getItem(key());
        const v = raw === null ? NaN : parseFloat(raw);
        saved = Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : null;
      } catch {
        // storage can be switched off; the page then simply opens at the top
      }
    }

    // the address's section, which the inline script lifted off the address
    const hash = window.__arrivalHash ?? "";
    delete window.__arrivalHash;
    const section = STOP_SECTIONS.some((s) => s.anchor === hash) ? hash : "";

    const target = arriving ? (saved ?? (section ? sectionProgress(section) : null)) : null;
    // give the address its section back, as it was
    const putBack = () => {
      if (hash && location.hash.slice(1) !== hash) {
        history.replaceState(history.state, "", `${location.pathname}${location.search}#${hash}`);
      }
    };

    // remember where the visitor is on the way out, for this tab
    const save = () => {
      try {
        sessionStorage.setItem(key(), String(progressNow()));
      } catch {
        // nothing to do without storage
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onHide);
    const unlisten = () => {
      removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onHide);
    };

    if (target === null || target < 0.002) {
      putBack();
      return unlisten;
    }

    // A visitor who takes the page themselves before it is ready has decided
    // where to go; nothing is started over them. That includes a scroll made
    // before this code had even loaded: the browser neither restores the
    // position any more nor jumps to the section, so a page that is not at
    // the top by now was put there by the visitor's own hand.
    let cancelled = window.scrollY > 2;
    const mine = () => {
      cancelled = true;
    };
    const opts = { passive: true, once: true } as const;
    addEventListener("wheel", mine, opts);
    addEventListener("touchstart", mine, opts);
    addEventListener("keydown", mine, { once: true });
    const quiet = () => {
      removeEventListener("wheel", mine);
      removeEventListener("touchstart", mine);
      removeEventListener("keydown", mine);
    };

    let stopWaiting = () => {};
    // Which layout is showing decides everything, and the two are not even
    // the same height — so nothing is placed until the backdrop has decided.
    const stopMode = onLayoutMode((mode) => {
      if (mode === "flat") {
        // no journey to show: the page goes straight back to where it was, or
        // to the section's own card for an address that named one
        quiet();
        if (!cancelled) {
          const el = saved === null && section ? document.getElementById(section) : null;
          if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
          else {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            window.scrollTo({ top: Math.round(target * max), behavior: "instant" });
          }
        }
        putBack();
        return;
      }
      // The page opens at the top, where the machine starts — whatever the
      // browser may have done in the meantime — and flies once there is a
      // picture to fly.
      if (!cancelled) window.scrollTo({ top: 0, behavior: "instant" });
      stopWaiting = onSceneReady(() => {
        quiet();
        if (!cancelled) rideToProgress(target);
        putBack();
      });
    });

    return () => {
      stopMode();
      stopWaiting();
      quiet();
      unlisten();
    };
  }, []);

  return null;
}
