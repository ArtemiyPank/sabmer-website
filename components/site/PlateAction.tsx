"use client";

import { useEffect, useRef } from "react";
import type { Stop } from "@/components/elevator3d/tour";
import { setPlateAction } from "@/lib/plate-action";

/**
 * The link for a button printed on a plate.
 *
 * A plate is a texture, so the button on it is lettering like the rest — this
 * is the part that can actually be pressed. It is transparent and carries no
 * look of its own: the scene lays it exactly over the button it belongs to
 * while the tour is parked there, and hides it everywhere else (see the frame
 * callback in ../elevator3d/parts/Engraved.tsx).
 *
 * The flowing layout needs none of this — it has real links in its sections.
 */
export default function PlateAction({
  stop,
  href,
  label,
}: {
  stop: Stop["id"];
  href: string;
  label: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    setPlateAction(stop, ref.current);
    return () => setPlateAction(stop, null);
  }, [stop]);

  return (
    <a
      ref={ref}
      href={href}
      aria-label={label}
      className="fixed z-30 cursor-pointer rounded-lg"
      style={{ visibility: "hidden", left: 0, top: 0, width: 0, height: 0 }}
    />
  );
}
