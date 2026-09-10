"use client";

/**
 * The link that belongs to the button printed on a plate.
 *
 * A plate is a texture, so it cannot carry a link itself: the button is drawn
 * into the lettering and a transparent anchor is laid over it. The scene knows
 * where that button lands on screen and the page owns the anchor, so they meet
 * here — the anchor registers itself, and `components/elevator3d/parts/
 * Engraved.tsx` moves it onto the button every frame it draws.
 */

let el: HTMLElement | null = null;

export const setPlateAction = (node: HTMLElement | null) => {
  el = node;
};
export const getPlateAction = () => el;
