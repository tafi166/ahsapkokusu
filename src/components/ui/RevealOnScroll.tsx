import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { fadeUp, viewportOnce } from "@/lib/motion";

interface RevealOnScrollProps {
  children: ReactNode;
  variants?: Variants;
  className?: string;
  delay?: number;
  as?: "div" | "li";
}

/**
 * Scroll-triggered reveal wrapper — the app's equivalent of the reference
 * theme's `data-aos="fade-up"` sections, built on Framer Motion's
 * `whileInView` so it respects `prefers-reduced-motion` automatically.
 */
export function RevealOnScroll({ children, variants = fadeUp, className, delay = 0, as = "div" }: RevealOnScrollProps) {
  const MotionTag = as === "li" ? motion.li : motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}
