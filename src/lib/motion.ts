import type { Variants } from "framer-motion";
import { theme } from "@/config/theme";

const { easeReveal, durationBase, durationSlow, revealDistance } = theme.motion;

/** Fade + rise on scroll — mirrors the reference theme's reveal easing/curve. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: revealDistance },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durationSlow, ease: easeReveal },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durationBase, ease: easeReveal } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durationSlow, ease: easeReveal },
  },
};

/** Stagger a group of children using fadeUp — pass to the parent's `variants`. */
export function staggerContainer(staggerDelay = 0.12): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerDelay },
    },
  };
}

export const viewportOnce = { once: true, margin: "-80px" } as const;
