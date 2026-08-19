"use client";

import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Fades the hero card out over the first screen of scrolling so the
 * opening phase of the schematic disassembly plays on a clean stage.
 */
export default function HeroFade({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 480], [1, 0]);
  const y = useTransform(scrollY, [0, 480], [0, -40]);

  return (
    <motion.div className={className} style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}
