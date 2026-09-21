"use client";

/**
 * A read-out of the last wheel gesture, for the one device this project's
 * harness cannot imitate: a trackpad. A headless browser has no fingers and
 * no momentum, so the shape of a real gesture — how many notches, how they
 * decay, where the hand comes off — can only be seen on the machine that has
 * one. Open the page with `?scrollProbe=1` and it reports each gesture in a
 * corner of the screen.
 *
 * Off unless asked for, and it writes nothing anywhere else.
 */

let box: HTMLElement | null = null;
let notches: number[] = [];
let handoverAt = -1;
let handoverV = 0;
let from = 0;
/**
 * The two numbers that tell one wrong gesture from another.
 *
 * `given` counts the times the page was handed back to the visitor in the
 * middle of one gesture: a coast that is aimed at a plate and then cancelled is
 * a page that sails past it, and more than one of these in a flick is the whole
 * of that fault. `back` is the furthest the page was driven the way it came —
 * a coast aimed at a plate already gone past, which reads as the page snatching
 * itself back to the sign it just passed.
 */
let given = 0;
let back = 0;
let watching = 0;
let highest = 0;

function watch() {
  const y = window.scrollY;
  if (y < highest) back = Math.max(back, highest - y);
  else highest = y;
  watching = requestAnimationFrame(watch);
}

export const probing = () =>
  typeof location !== "undefined" && location.search.includes("scrollProbe");

function panel() {
  if (box) return box;
  box = document.createElement("div");
  box.style.cssText =
    "position:fixed;left:8px;bottom:8px;z-index:9999;max-width:min(92vw,760px);" +
    "padding:8px 10px;border-radius:8px;background:rgba(17,24,39,.92);color:#e5e7eb;" +
    "font:12px/1.5 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;pointer-events:none";
  document.body.appendChild(box);
  return box;
}

/** draw the panel as soon as the page is open with the probe asked for */
export function probeReady() {
  if (!probing()) return;
  panel().textContent = "scroll read-out is on — scroll with the trackpad";
}

export function probeGesture(y: number) {
  if (!probing()) return;
  notches = [];
  handoverAt = -1;
  handoverV = 0;
  given = 0;
  back = 0;
  from = y;
  highest = y;
  if (!watching) watching = requestAnimationFrame(watch);
}

/** the page was handed back to the visitor without the gesture having ended */
export function probeGaveBack() {
  if (!probing()) return;
  if (handoverAt >= 0) given += 1;
}

export function probeNotch(d: number) {
  if (!probing()) return;
  notches.push(Math.round(d));
  panel().textContent = `reading a gesture… ${notches.length} notches`;
}

export function probeHandover(v: number) {
  if (!probing()) return;
  handoverAt = notches.length;
  handoverV = v;
}

/** called once the page has come to rest; `stops` are the plates it passed */
export function probeRest(y: number, range: number, crossedAfterHand: number, refused = 0) {
  if (!probing()) return;
  if (watching) {
    cancelAnimationFrame(watching);
    watching = 0;
  }
  if (notches.length === 0) {
    panel().textContent = "the page came to rest with no wheel gesture behind it";
    return;
  }
  const peak = Math.max(...notches);
  const shown = notches.length > 24 ? [...notches.slice(0, 12), -1, ...notches.slice(-10)] : notches;
  panel().textContent =
    `notches ${notches.length}, peak ${peak}\n` +
    `[${shown.map((d) => (d < 0 ? "…" : d)).join(" ")}]\n` +
    (handoverAt < 0
      ? "handover: never — the page was the browser's the whole way\n"
      : `handover: notch ${handoverAt} of ${notches.length}, v ${handoverV.toFixed(2)} px/ms\n`) +
    `from p=${(from / range).toFixed(3)} to p=${(y / range).toFixed(3)}, ` +
    `plates crossed after the handover: ${crossedAfterHand}\n` +
    `handed back mid-gesture: ${given}   ·   driven backwards: ${Math.round(back)}px\n` +
    `notches refused so the flick kept to one plate: ${refused}`;
}
