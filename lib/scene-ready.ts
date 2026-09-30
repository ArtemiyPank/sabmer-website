"use client";

/**
 * Whether the 3D scene has drawn its first frame yet.
 *
 * Something that wants to show the visitor a journey — the flight back to
 * where they were before a reload — has to wait for there to be a picture to
 * fly: started earlier, it plays to a blank canvas, and the camera has no pose
 * of its own yet to set off from.
 */
let ready = false;
const waiting = new Set<() => void>();

export function markSceneReady() {
  if (ready) return;
  ready = true;
  waiting.forEach((fn) => fn());
  waiting.clear();
}

/** runs `fn` once the scene has drawn, at once if it already has; returns a canceller */
export function onSceneReady(fn: () => void): () => void {
  if (ready) {
    fn();
    return () => {};
  }
  waiting.add(fn);
  return () => {
    waiting.delete(fn);
  };
}
