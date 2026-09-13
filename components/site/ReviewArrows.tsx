"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";
import { STOPS } from "@/components/elevator3d/tour";
import { stepReview } from "@/lib/reviews";

/**
 * Pages through the reviews lettered on the counterweight. The arrows only
 * exist while the tour is parked on that plate — anywhere else there is
 * nothing to page — and they sit clear of the plate itself, one at each edge.
 */
const REVIEWS = STOPS.findIndex((s) => s.id === "reviews");
/** how close to the stop counts as parked on it */
const NEAR = 0.045;

export default function ReviewArrows({ count }: { count: number }) {
  const t = useTranslations("Reviews");
  const { scrollYProgress } = useScroll();
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setShown(REVIEWS >= 0 && Math.abs(v - STOPS[REVIEWS].p) < NEAR);
  });

  // nothing to page through with a single review
  if (REVIEWS < 0 || count < 2) return null;
  const arrow = (dir: -1 | 1) => (
    <button
      type="button"
      onClick={() => stepReview(dir)}
      aria-label={dir < 0 ? t("prev") : t("next")}
      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition-transform hover:scale-105 active:scale-95"
      style={{
        backgroundColor: "var(--bp-paper)",
        borderColor: "var(--bp-line-soft)",
        color: "var(--bp-accent)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d={dir < 0 ? "M12.5 4 6.5 10l6 6" : "M7.5 4l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  return (
    <div
      aria-hidden={!shown}
      className="pointer-events-none fixed inset-x-0 top-1/2 z-30 flex -translate-y-1/2 items-center justify-between px-3 transition-opacity duration-300 md:px-8"
      style={{ opacity: shown ? 1 : 0, visibility: shown ? "visible" : "hidden" }}
    >
      {arrow(-1)}
      {arrow(1)}
    </div>
  );
}
