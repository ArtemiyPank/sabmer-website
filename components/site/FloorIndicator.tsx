"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";
import { useTranslations } from "next-intl";

const TOP_FLOOR = 4;
const FLOORS = [4, 3, 2, 1] as const;

// section anchors in page order -> Header translation keys
const SECTIONS = [
  ["top", "home"],
  ["about", "about"],
  ["founders", "founders"],
  ["careers", "careers"],
  ["contacts", "contacts"],
] as const;

type SectionKey = (typeof SECTIONS)[number][1];

function sectionAt(scrollTop: number): SectionKey {
  const pos = scrollTop + window.innerHeight * 0.35;
  let key: SectionKey = "home";
  for (const [id, k] of SECTIONS) {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= pos) key = k;
  }
  return key;
}

const floorTarget = (floor: number) => {
  const p = (TOP_FLOOR - floor) / (TOP_FLOOR - 1);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return p * max;
};

/**
 * Elevator car position indicator in the header, driven by scroll progress
 * and matching the landing levels on the schematic. Clicking it opens a
 * COP-style floor panel; pressing a floor scrolls the page (and the cab)
 * to that landing.
 */
export default function FloorIndicator() {
  const t = useTranslations("Header");
  const { scrollYProgress } = useScroll();
  const [floor, setFloor] = useState(TOP_FLOOR);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const [section, setSection] = useState<SectionKey>("home");
  const [open, setOpen] = useState(false);
  const [panelLabels, setPanelLabels] = useState<Record<number, SectionKey>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  // initial section (e.g. when landing on an #anchor mid-page)
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setSection(sectionAt(window.scrollY))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(
      TOP_FLOOR,
      Math.max(1, TOP_FLOOR - Math.round(v * (TOP_FLOOR - 1)))
    );
    setFloor((prev) => {
      if (next !== prev) setDir(next < prev ? "down" : "up");
      return next;
    });
    setSection(sectionAt(window.scrollY));
  });

  const openPanel = () => {
    // label each floor with the section the ride will arrive at
    setPanelLabels(
      Object.fromEntries(FLOORS.map((f) => [f, sectionAt(floorTarget(f))]))
    );
    setOpen((o) => !o);
  };

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

  const goTo = (target: number) => {
    // same progress mapping as the readout above
    const p = (TOP_FLOOR - target) / (TOP_FLOOR - 1);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: p * max, behavior: "smooth" });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={openPanel}
        aria-label={t("floorNav")}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-sm tabular-nums transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--card-border)", color: "var(--bp-accent)" }}
      >
        <span className="text-xs opacity-70">
          {dir === "down" ? "▼" : dir === "up" ? "▲" : "•"}
        </span>
        {floor}
        <span className="hidden max-w-32 truncate text-xs opacity-70 sm:inline">
          · {t(section)}
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
          {FLOORS.map((f) => (
            <button
              key={f}
              type="button"
              role="menuitem"
              onClick={() => goTo(f)}
              aria-label={t("floorGoTo", { floor: f })}
              aria-current={f === floor ? "true" : undefined}
              className="group flex w-full items-center gap-3 rounded-lg px-1.5 py-1 text-start transition-opacity hover:opacity-90"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-sm transition-transform group-hover:scale-105 group-active:scale-95"
                style={{
                  borderColor:
                    f === floor ? "var(--bp-accent)" : "var(--card-border)",
                  color: f === floor ? "var(--bp-accent)" : "inherit",
                  boxShadow:
                    f === floor ? "0 0 6px var(--bp-accent)" : undefined,
                }}
              >
                {f}
              </span>
              <span
                className="whitespace-nowrap text-sm"
                style={{
                  color: f === floor ? "var(--bp-accent)" : "inherit",
                  opacity: f === floor ? 1 : 0.75,
                }}
              >
                {panelLabels[f] ? t(panelLabels[f]) : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
