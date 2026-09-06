"use client";

/**
 * How the page text is presented over the blueprint: four layouts of the same
 * content, switchable live so the presentation can be compared on a real
 * device. The choice lives in `data-ui` on <html> (never rendered by React, so
 * a client-side locale switch cannot reset it) plus localStorage.
 */

export const UI_VARIANTS = ["sheets", "callout", "titleblock", "plain"] as const;
export type UiVariant = (typeof UI_VARIANTS)[number];

export const UI_LABELS: Record<UiVariant, string> = {
  sheets: "SHEETS",
  callout: "CALLOUTS",
  titleblock: "TITLE BLOCK",
  plain: "PLAIN",
};

/**
 * Horizontal pan of the 3D drawing (metres added to the camera target, so a
 * positive value slides the hoistway to the left of the screen). Each layout
 * parks the drawing in the half the text does not use; phones have no room to
 * pan, so there the drawing stays centred and the text sheets change instead.
 */
export const UI_PAN: Record<UiVariant, number> = {
  sheets: 0,
  callout: -2.8,
  titleblock: 2.8,
  plain: -3.6,
};

const listeners = new Set<() => void>();

export function subscribeUi(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readUi(): UiVariant {
  try {
    const v = localStorage.getItem("ui");
    if (UI_VARIANTS.includes(v as UiVariant)) return v as UiVariant;
  } catch {}
  const attr = document.documentElement.dataset.ui;
  return UI_VARIANTS.includes(attr as UiVariant) ? (attr as UiVariant) : "sheets";
}

export function writeUi(v: UiVariant) {
  try {
    localStorage.setItem("ui", v);
  } catch {}
  document.documentElement.dataset.ui = v;
  listeners.forEach((l) => l());
}
