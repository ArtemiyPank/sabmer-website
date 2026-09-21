"use client";

import type { Stop } from "@/components/elevator3d/tour";

/**
 * The links that belong to the buttons printed on the plates.
 *
 * A plate is a texture, so it cannot carry a link itself: the button is drawn
 * into the lettering and a transparent anchor is laid over it. The scene knows
 * where that button lands on screen and the page owns the anchor, so they meet
 * here — each anchor registers itself under the plate it belongs to, and
 * `components/elevator3d/parts/Engraved.tsx` moves the one whose plate the
 * tour is parked on, hiding the rest.
 */

const anchors = new Map<Stop["id"], HTMLElement>();

export const setPlateAction = (id: Stop["id"], node: HTMLElement | null) => {
  if (node) anchors.set(id, node);
  else anchors.delete(id);
};
export const getPlateAction = (id: Stop["id"]) => anchors.get(id) ?? null;
