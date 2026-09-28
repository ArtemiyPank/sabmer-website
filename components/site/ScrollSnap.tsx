"use client";

import { useEffect } from "react";
import { STOPS, refuge } from "@/components/elevator3d/tour";
import { getBehind, getRide, rideToProgress, setHold } from "@/lib/ride";
import { COAST } from "@/lib/tuning";
import { probeGaveBack, probeGesture, probeHandover, probeNotch, probeReady, probeRest, probing } from "@/lib/scroll-probe";

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
    /**
     * The plate this flick may reach, and whether it has had it yet.
     *
     * A trackpad's notches are accelerated by the system: one hard flick's
     * *fingers* deliver two to four thousand pixels before any momentum exists
     * at all, which is two to four plates on this page. Every rule that only
     * governs the coast is therefore governing the tail end of a journey that
     * was already over. The one lever that reaches the fingers is the notch
     * itself — a wheel event is sent before the page moves, so refusing it
     * stops the movement it was going to cause.
     *
     * So the flick is given exactly one plate. The notch that would carry the
     * page onto it is refused, and the coast covers the last of the distance;
     * every notch after that is refused too, because the flick has had what it
     * asked for. The next plate is a new flick's to ask for.
     */
    let aim: number | null = null;
    let aimDir = 1;
    /**
     * Whether this gesture is ours to refuse.
     *
     * Chromium sends the first wheel event of a scroll sequence blocking and,
     * if the page lets it through, sends every later one non-blocking — thirty
     * notches of a flick arrive with `cancelable` false and `preventDefault`
     * does nothing at all. A page that waits to see where a flick is heading
     * therefore finds, at the moment it wants to act, that it gave away the
     * only lever it had on the first notch.
     *
     * So the first notch is taken: refused, and its distance applied here
     * instead, which costs nothing visible and keeps the whole sequence
     * blocking. Only then can the notch that would carry the page past its
     * plate be refused — and on a trackpad that notch is the seventh or the
     * ninth, never the first.
     */
    let owned = false;
    /**
     * Is this gesture being ignored because the machine has not arrived yet?
     *
     * Decided once, when the gesture opens, and kept for the whole of it: a
     * flick that is turned away should stay turned away even if the machine
     * finishes mid-fling, or its leftover momentum would move the page the
     * moment the way cleared — which is the queue again, one flick later.
     */
    let ignored = false;
    /** is this the notch that opened the gesture? */
    let first = false;
    let spent = false;
    /** how the notches have behaved since the flick was given its plate */
    let spentAt = 0;
    let spentMax = 0;
    let refused = 0;

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
    /**
     * The first stop the page would pass travelling in `dir` from `y`, ignoring
     * any nearer than `slack`. A plate a few pixels away is the one the page is
     * standing on, not one it is heading for.
     */
    const beyond = (y: number, dir: number, slack = 8) => {
      if (dir > 0) {
        for (let i = 0; i < STOPS.length; i++) if (stopY(i) > y + slack) return stopY(i);
        return null;
      }
      for (let i = STOPS.length - 1; i >= 0; i--) if (stopY(i) < y - slack) return stopY(i);
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
     *
     * Where it ends is always ahead of where it starts. A coast aimed at a
     * plate the page has already gone past would drive it back the way it came
     * under a hand that is still pushing it forward, which reads as the page
     * snatching itself back to the sign before last. `beyond` below only ever
     * answers with a plate the page has yet to reach.
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

    /**
     * Carries the page the last of the way onto `land`, at the speed the
     * visitor was driving at. Used only where the notch that would have
     * crossed that plate has just been refused, so the plate is still ahead of
     * the page and this can never run backwards; the check is kept anyway,
     * because a browser may decline to let a notch be refused.
     */
    const coastTo = (land: number, v0: number) => {
      if (!engraved() || getRide().running || performance.now() - mounted < 600) return;
      releaseHold();
      cy = window.scrollY;
      const d = land - cy;
      if (d * aimDir <= 0) {
        startCoast(v0);
        return;
      }
      const v = clamp(Math.abs(v0), COAST.throwSpeed, COAST.maxSpeed);
      ctarget = land;
      ctau = clamp(Math.abs(d) / v, COAST.tauMin, COAST.tauMax);
      cv = d / ctau;
      lastStep = performance.now();
      if (!coastFrame) coastFrame = requestAnimationFrame(coast);
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
    /**
     * Is anything still moving the page?
     *
     * A wheel gesture still delivering notches counts, whether or not those
     * notches are being allowed to move anything. A hand on the trackpad has
     * obviously not finished; and a flick that has had its plate goes on
     * sending notches for a second or more after the page has stopped dead,
     * so a page that has stopped moving is not yet a page that has come to
     * rest. Counting it as one takes the visitor somewhere mid-gesture, and
     * writes the read-out before there is anything to read.
     */
    const driving = () =>
      touching ||
      getRide().running ||
      coastFrame !== 0 ||
      held !== null ||
      performance.now() - handAt < COAST.gestureGap;

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
        probeRest(y, range(), past, refused);
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
    /**
     * The page becomes ours for the rest of this gesture.
     *
     * `land` is the plate the flick asked for, when it was a refused notch
     * that brought us here; without one the ordinary plate rule picks where
     * the coast ends. Either way the gesture is now spent: every notch it has
     * left is refused, so neither the fingers nor the fling can add to a
     * journey that has already been decided. Nothing takes the page back but
     * a new gesture — or notches that go on arriving at full size, which is a
     * hand that never left (see the `spent` branch in onWheel).
     */
    const takeOver = (land: number | null) => {
      if (handedOver) return;
      handedOver = true;
      spent = true;
      spentAt = performance.now();
      spentMax = 0;
      probeHandover(wheelV);
      handoverY = window.scrollY;
      if (land === null) startCoast(wheelV);
      else coastTo(land, wheelV);
    };
    const handOver = () => takeOver(null);

    const onWheel = (e: WheelEvent) => {
      // the moment the notch happened, not the moment we got round to it: on
      // a loaded machine handlers run late and bunched, and a clock read here
      // would report a gesture shape that never occurred
      // a pinch on the trackpad arrives as a wheel event too, and is nobody's
      // business here: it is not asking the page to go anywhere
      if (e.ctrlKey) return;
      const now = e.timeStamp || performance.now();
      const d = Math.abs(e.deltaY);
      // the tail of a fling the browser has already given up on: no distance,
      // no information, and letting it keep the gesture alive would hold the
      // page for seconds after the hand is long gone
      if (d === 0) return;
      const since = now - gestureAt;
      if (since > COAST.gestureGap) {
        // a new gesture: the page is theirs again, and the plate it is asking
        // for is the next one along from where it stands
        peak = 0;
        lastD = 0;
        fading = 0;
        wheelV = 0;
        handedOver = false;
        spent = false;
        refused = 0;
        aimDir = Math.sign(e.deltaY) || 1;
        aim = engraved() ? beyond(window.scrollY, aimDir, COAST.reach) : null;
        // the machine is still travelling: this flick has nothing to ask for
        ignored = engraved() && e.cancelable && getBehind() > COAST.busy;
        // sideways scrolling is not ours, and neither is a sequence the
        // browser has already decided it will not let us cancel
        owned = aim !== null && e.cancelable && Math.abs(e.deltaY) >= Math.abs(e.deltaX);
        first = true;
        probeGesture(window.scrollY, ignored);
        giveBack();
      } else {
        first = false;
      }
      if (ignored) {
        e.preventDefault();
        refused += 1;
        probeNotch(d);
        gestureAt = now;
        handAt = now;
        return;
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
      /**
       * A notch bigger than anything this gesture has yet produced: the one
       * thing momentum cannot do.
       *
       * Momentum starts at the speed the fingers left behind and only ever
       * loses to it, so no notch of a fling can exceed the peak of the push
       * that threw it. Fingers can, and a hand coming back to the trackpad is
       * the only reason to take the page off a coast that is already aimed at
       * a plate. Asking merely for a notch bigger than the one before it —
       * which is what this used to do — is asking for nothing: a fling's
       * notches are whole pixels, so they tick back up on rounding alone
       * several times on the way down, and every one of those handed the page
       * back to a fling in full flight. That is the page sailing past its
       * plate, and it is also the page seeming to leap.
       */
      lastD = d;
      if (d > peak) peak = d;

      if (spent) {
        if (d > spentMax) spentMax = d;
        /**
         * Is this still the fling, or a hand that never left?
         *
         * Told apart by how long the stream keeps its strength, which is the
         * one thing the two cannot both do. A fling is spent energy: by the
         * time two thirds of a second have passed it is a small fraction of
         * the notch that started it, whatever shape its decay took. Fingers on
         * the glass are not spending anything, and a notch still arriving at
         * half strength that late is a hand — and a visitor dragging
         * deliberately down the page must not find it nailed to one sign.
         *
         * Counting notches instead of time does not work: a flick's stream is
         * noisy, a drag's is smooth, and both produce runs of similar notches.
         * Nor does a single big notch mean anything — the finger phase of one
         * flick spikes several times on its way (a real read-out shows 208
         * then 448, 240 then 574), and treating each spike as a fresh push is
         * what let one flick spend four plates.
         */
        const stillDriving =
          performance.now() - spentAt > COAST.spentFor && d > spentMax * COAST.spentHold;
        if (stillDriving) {
          spent = false;
          handedOver = false;
          fading = 0;
          probeGaveBack();
          giveBack();
          aim = beyond(window.scrollY, aimDir, COAST.reach);
        } else {
          // the flick has had its plate; the rest of it moves nothing
          if (owned && e.cancelable) {
            e.preventDefault();
            refused += 1;
          }
          // and the landing is held for as long as it goes on arriving
          if (held !== null) heldAt = performance.now();
          return;
        }
      }

      // A wheel event is sent before the page moves, so where this notch would
      // put it is still a question rather than a fact.
      if (owned && !handedOver && aim !== null) {
        const willBe = clamp(window.scrollY + e.deltaY, 0, maxY());
        if (aimDir > 0 ? willBe >= aim : willBe <= aim) {
          // it would carry the page onto the plate the flick asked for, and
          // past it: refuse it, and let the coast cover the last of the way
          e.preventDefault();
          refused += 1;
          takeOver(aim);
          return;
        }
        if (first) {
          // the notch that bought the right to refuse the rest
          e.preventDefault();
          window.scrollTo({ top: willBe, behavior: "instant" });
        }
      }

      if (!handedOver) {
        if (falling) fading += 1;
        else if (rising) fading = 0;
        if (fading >= COAST.fadeFor && peak >= COAST.wheelPeak) handOver();
      }

      // a gesture that simply stops — a mouse wheel, or a flick too short to
      // show a fade at all — hands over once the wheel has gone quiet
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(handOver, COAST.handFor);
    };

    /**
     * The keyboard is a tour of its own.
     *
     * Every other way of driving the page leaves a speed behind that the coast
     * can be aimed with. A key press leaves none: the browser simply moves the
     * page a screenful and stops, which on this page is always *between* two
     * plates — so a visitor who navigates by keyboard could read the copy on
     * the machine at no point at all. A page key therefore asks for the next
     * plate outright and the page rides there, the same trip a floor button
     * takes. The arrow keys are left alone: a nudge of a few lines is the one
     * keyboard gesture that is not asking to go anywhere.
     */
    const typing = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    /** a space bar pressed on a control is that control's, not the page's */
    const onAControl = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el?.closest?.("a[href], button, [role='button']");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      giveBack();
      if (!engraved() || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (typing()) return;
      const space = e.key === " " || e.key === "Spacebar";
      if (space && onAControl()) return;
      let dir = 0;
      if (e.key === "PageDown" || (space && !e.shiftKey)) dir = 1;
      else if (e.key === "PageUp" || (space && e.shiftKey)) dir = -1;
      else if (e.key === "End") dir = 2;
      else if (e.key === "Home") dir = -2;
      else return;
      e.preventDefault();
      const y = window.scrollY;
      const land =
        Math.abs(dir) === 2
          ? dir > 0
            ? maxY()
            : 0
          : (beyond(y, dir) ?? (dir > 0 ? maxY() : 0));
      rideToProgress(land / range());
    };

    probeReady();
    addEventListener("scroll", onScroll, { passive: true });
    // not passive: a notch that would carry the page past the plate the flick
    // asked for is refused, and only a listener allowed to refuse can do that
    addEventListener("wheel", onWheel, { passive: false });
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
