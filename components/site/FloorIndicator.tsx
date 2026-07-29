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
  ["projects", "projects"],
  ["founders", "founders"],
  ["careers", "careers"],
  ["contacts", "contacts"],
] as const;

function currentSection(): (typeof SECTIONS)[number][1] {
  const pos = window.scrollY + window.innerHeight * 0.35;
  let key: (typeof SECTIONS)[number][1] = "home";
  for (const [id, k] of SECTIONS) {
    const el = document.getElementById(id);
    if (el && el.offsetTop <= pos) key = k;
  }
  return key;
}

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
  const [section, setSection] =
    useState<(typeof SECTIONS)[number][1]>("home");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // initial section (e.g. when landing on an #anchor mid-page)
  useEffect(() => {
    setSection(currentSection());
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
    setSection(currentSection());
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
        {floor}
        <span className="hidden max-w-32 truncate text-xs opacity-70 sm:inline">
          · {t(section)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 flex flex-col gap-1.5 rounded-xl border p-2 backdrop-blur-md"
          style={{
            backgroundColor: "var(--card)",
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
              className="flex h-9 w-9 items-center justify-center rounded-full border font-mono text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                borderColor:
                  f === floor ? "var(--bp-accent)" : "var(--card-border)",
                color: f === floor ? "var(--bp-accent)" : "inherit",
                boxShadow:
                  f === floor ? "0 0 6px var(--bp-accent)" : undefined,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
