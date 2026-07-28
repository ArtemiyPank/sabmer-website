"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "framer-motion";

const TOP_FLOOR = 4;

/**
 * Elevator car position indicator in the header: shows the floor the cab is
 * passing (4 -> 1) and the travel direction, driven by scroll progress —
 * matching the landing levels drawn on the schematic.
 */
export default function FloorIndicator() {
  const { scrollYProgress } = useScroll();
  const [floor, setFloor] = useState(TOP_FLOOR);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(
      TOP_FLOOR,
      Math.max(1, TOP_FLOOR - Math.round(v * (TOP_FLOOR - 1)))
    );
    setFloor((prev) => {
      if (next !== prev) setDir(next < prev ? "down" : "up");
      return next;
    });
  });

  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-sm tabular-nums"
      style={{
        borderColor: "var(--card-border)",
        color: "var(--bp-accent)",
      }}
    >
      <span className="text-xs opacity-70">
        {dir === "down" ? "▼" : dir === "up" ? "▲" : "•"}
      </span>
      {floor}
    </div>
  );
}
