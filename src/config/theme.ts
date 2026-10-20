/**
 * Theme layer — design tokens mirrored from styles/globals.css so
 * TypeScript/Framer Motion code can reference the same values instead
 * of re-guessing colors, easings, and durations inline.
 *
 * Keep this in sync with the `@theme` block in styles/globals.css.
 */
export const theme = {
  color: {
    paper: "#ffffff",
    paperSoft: "#f8f8f8",
    ink: "#000000",
    body: "#282828",
    line: "#f1f1f1",
    divider: "#cccccc",
    accent: "#ffc400",
    accentDeep: "#5c0000",
    footerBg: "#000000",
    footerInk: "#ffffff",
    footerLink: "#cfd0d4",
  },

  radius: {
    box: "0px",
    card: "10px",
    input: "0px",
    pill: "100px",
  },

  container: {
    lg: 1760,
    md: 1400,
    sm: 1280,
  },

  breakpoint: {
    xs: 375,
    sm: 480,
    ms: 575,
    md: 768,
    lg: 992,
    xl: 1199,
    "2xl": 1366,
    "3xl": 1440,
    "4xl": 1700,
  },

  motion: {
    /** Easing lifted from the reference theme's scroll-reveal stylesheet (ease-in-out-quad). */
    easeReveal: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
    durationFast: 0.2,
    durationBase: 0.4,
    durationSlow: 0.7,
    revealDistance: 32,
  },
} as const;

export type Theme = typeof theme;
