"use client";

/**
 * Which way the page is being shown, once that has been decided: "tour" —
 * the 3D scene, flying from plate to plate — or "flat", the page's own text
 * over the 2D drawing (no WebGL, or reduced motion).
 *
 * The backdrop cannot know until the browser has been asked about WebGL,
 * which happens after the first render, and the two layouts are not even the
 * same height. Anything that needs to place the page — putting the scroll back
 * after a reload — has to wait for this rather than guess from the first
 * frame it sees.
 */
export type LayoutMode = "tour" | "flat";

let mode: LayoutMode | null = null;
const waiting = new Set<(m: LayoutMode) => void>();

export function setLayoutMode(m: LayoutMode) {
  const first = mode === null;
  mode = m;
  if (!first) return;
  waiting.forEach((fn) => fn(m));
  waiting.clear();
}

/** runs `fn` with the mode once it is known, at once if it already is; returns a canceller */
export function onLayoutMode(fn: (m: LayoutMode) => void): () => void {
  if (mode !== null) {
    fn(mode);
    return () => {};
  }
  waiting.add(fn);
  return () => {
    waiting.delete(fn);
  };
}
