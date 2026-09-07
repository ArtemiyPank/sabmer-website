"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";
import { rideToProgress } from "@/lib/ride";
import { STOP_SECTIONS, STOPS, currentStop } from "@/components/elevator3d/tour";

/**
 * The car's position indicator in the header. It names the stop of the camera
 * tour that is on screen, and its panel is the car operating panel: one
 * button per stop, in the order the tour visits them. Pressing one rides the
 * page to that stop's exact progress, so the camera always parks on the
 * matching plate rather than somewhere along the way.
 *
 * Phones only — on a wide screen the section links in the header do the same
 * job, so the panel would be a second control for one thing.
 */
export default function FloorIndicator() {
  const t = useTranslations("Header");
  const { scrollYProgress } = useScroll();
  const [stop, setStop] = useState(0);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // initial stop (e.g. when landing on an #anchor mid-page)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setStop(currentStop(max > 0 ? window.scrollY / max : 0));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = currentStop(v);
    setStop((prev) => {
      if (next !== prev) setDir(next > prev ? "down" : "up");
      return next;
    });
  });

  // close the panel on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const goTo = (index: number) => {
    rideToProgress(STOPS[index].p);
    setOpen(false);
  };

  const label = (i: number) => t(STOP_SECTIONS[i].key as "home");
  const num = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <div ref={rootRef} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("floorNav")}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-sm tabular-nums transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--card-border)", color: "var(--bp-accent)" }}
      >
        <span className="text-xs opacity-70">
          {dir === "down" ? "▼" : dir === "up" ? "▲" : "•"}
        </span>
        {num(stop)}
        <span className="hidden max-w-32 truncate text-xs opacity-70 sm:inline">
          · {label(stop)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 flex flex-col gap-1.5 rounded-xl border p-2 shadow-lg"
          style={{
            // solid paper background so labels stay readable over the drawing
            backgroundColor: "var(--bp-paper)",
            borderColor: "var(--card-border)",
          }}
        >
          {STOP_SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="menuitem"
              onClick={() => goTo(i)}
              aria-current={i === stop ? "true" : undefined}
              className="group flex w-full items-center gap-3 rounded-lg px-1.5 py-1 text-start transition-opacity hover:opacity-90"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-sm transition-transform group-hover:scale-105 group-active:scale-95"
                style={{
                  borderColor: i === stop ? "var(--bp-accent)" : "var(--card-border)",
                  color: i === stop ? "var(--bp-accent)" : "inherit",
                  boxShadow: i === stop ? "0 0 6px var(--bp-accent)" : undefined,
                }}
              >
                {num(i)}
              </span>
              <span
                className="whitespace-nowrap text-sm"
                style={{
                  color: i === stop ? "var(--bp-accent)" : "inherit",
                  opacity: i === stop ? 1 : 0.75,
                }}
              >
                {label(i)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
