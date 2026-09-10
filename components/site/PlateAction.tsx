"use client";

import { useEffect, useRef } from "react";
import { setPlateAction } from "@/lib/plate-action";

/**
 * The link for the button printed on a plate.
 *
 * A plate is a texture, so the button on it is lettering like the rest — this
 * is the part that can actually be pressed. It is transparent and carries no
 * look of its own: the scene lays it exactly over the button it belongs to
 * while the tour is parked there, and hides it everywhere else (see the frame
 * callback in ../elevator3d/parts/Engraved.tsx).
 *
 * The flowing layout needs none of this — it has a real button in the section.
 */
export default function PlateAction({ href, label }: { href: string; label: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    setPlateAction(ref.current);
    return () => setPlateAction(null);
  }, []);

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="fixed z-30 cursor-pointer rounded-lg"
      style={{ visibility: "hidden", left: 0, top: 0, width: 0, height: 0 }}
    />
  );
}
