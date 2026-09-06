"use client";

import { useEffect, useSyncExternalStore } from "react";
import { UI_LABELS, UI_VARIANTS, readUi, subscribeUi, writeUi, type UiVariant } from "@/lib/ui-variant";

/**
 * Live switch between the four ways the text can sit on the drawing. Drawn as
 * a small drafting-style strip pinned to the bottom of the viewport so the
 * layouts can be compared on a phone without reloading.
 */
export default function LayoutSwitcher() {
  const ui = useSyncExternalStore(subscribeUi, readUi, () => null);

  // a client-side locale switch remounts <html>, which drops the attribute
  useEffect(() => {
    if (ui) document.documentElement.dataset.ui = ui;
  }, [ui]);

  return (
    <div
      dir="ltr"
      className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 print:hidden"
      style={{ font: "600 10px/1 ui-monospace, SFMono-Regular, monospace", letterSpacing: "0.14em" }}
    >
      <div
        className="flex items-stretch overflow-hidden rounded-full border shadow-sm"
        style={{
          borderColor: "var(--bp-line-soft)",
          backgroundColor: "var(--bp-paper)",
          color: "var(--bp-line)",
        }}
      >
        <span className="hidden px-3 py-2.5 opacity-50 sm:inline">LAYOUT</span>
        {UI_VARIANTS.map((v: UiVariant) => (
          <button
            key={v}
            type="button"
            onClick={() => writeUi(v)}
            aria-pressed={ui === v}
            className="border-s px-3 py-2.5 uppercase transition-opacity hover:opacity-100"
            style={{
              borderColor: "var(--bp-line-soft)",
              opacity: ui === v ? 1 : 0.5,
              color: ui === v ? "var(--bp-accent)" : "inherit",
              backgroundColor: ui === v ? "color-mix(in srgb, var(--bp-accent) 12%, transparent)" : "transparent",
            }}
          >
            {UI_LABELS[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
