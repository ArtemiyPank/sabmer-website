"use client";

/**
 * Which review the plate on the counterweight is showing. It lives outside
 * React because the plate is a canvas texture inside the 3D scene while the
 * arrows that page through it are ordinary DOM — both need the same number,
 * and neither owns it.
 */
let index = 0;
const listeners = new Set<() => void>();

export const getReview = () => index;
export const subscribeReview = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
/** step forward or back; the plate wraps the number against its own count */
export const stepReview = (by: number) => {
  index += by;
  listeners.forEach((fn) => fn());
};
