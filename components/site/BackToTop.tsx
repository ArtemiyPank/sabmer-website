"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";
import { rideToProgress } from "@/lib/ride";

/**
 * Rides the page back to the first stop. Appears once the tour has left the
 * cab, in the corner opposite the floor panel.
 */
export default function BackToTop() {
  const t = useTranslations("Header");
  const { scrollYProgress } = useScroll();
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => setShown(v > 0.12));

  return (
    <button
      type="button"
      onClick={() => rideToProgress(0)}
      aria-label={t("home")}
      className="fixed bottom-4 end-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition-all hover:scale-105 active:scale-95"
      style={{
        backgroundColor: "var(--bp-paper)",
        borderColor: "var(--bp-line-soft)",
        color: "var(--bp-accent)",
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? "auto" : "none",
        transform: shown ? undefined : "translateY(8px)",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M9 15V3M9 3 3.5 8.5M9 3l5.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
