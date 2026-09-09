"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";
import { STOPS } from "@/components/elevator3d/tour";
import WhatsAppButton from "./WhatsAppButton";

/**
 * The way to apply, offered where the terms are.
 *
 * The terms are lettered on the side of the car, and a plate cannot carry a
 * link — so the button appears over the page while the tour is parked on that
 * plate and goes away again when it leaves, the same way the review arrows do.
 * It sits clear of the back-to-top button in the corner.
 */
const JOBS = STOPS.findIndex((s) => s.id === "jobs");
/** how close to the stop counts as parked on it */
const NEAR = 0.045;

export default function JobsApply() {
  const t = useTranslations("Jobs");
  const { scrollYProgress } = useScroll();
  const [shown, setShown] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setShown(JOBS >= 0 && Math.abs(v - STOPS[JOBS].p) < NEAR);
  });

  if (JOBS < 0) return null;
  return (
    <div
      aria-hidden={!shown}
      className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 transition-opacity duration-300 md:bottom-8"
      style={{ opacity: shown ? 1 : 0, visibility: shown ? "visible" : "hidden" }}
    >
      <span className="pointer-events-auto">
        <WhatsAppButton variant="raised" label={t("whatsapp")} message={t("whatsappText")} />
      </span>
    </div>
  );
}
