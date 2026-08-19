"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Content card that dissolves against the schematic: fades in quickly while
 * entering from the bottom and dissolves while leaving through the top, so
 * the drawing takes the stage between sections.
 */
export default function FadeCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    // 0: card top enters at the viewport bottom
    // 1: card bottom passes 20% of the viewport height
    offset: ["start end", "end 0.2"],
  });
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.8, 1],
    [0.25, 1, 1, 0]
  );

  return (
    <motion.div ref={ref} className={className} style={{ opacity }}>
      {children}
    </motion.div>
  );
}
