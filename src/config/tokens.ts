/** Ahşap Kokusu brand palette, mirrored in styles/globals.css. */
export const tokens = {
  // ---------------------------------------------------------------------------
  // Color
  // ---------------------------------------------------------------------------
  color: {
    // Foundation
    paper: "#FFFCF7",
    paperSoft: "#F6F2EA",
    ink: "#24231F",
    body: "#49443C",
    line: "#E5DDD0",
    divider: "#A69A8A",
    mist: "#EDE5D9",

    // Brand accent
    accent: "#BC8658",
    accentDeep: "#5A341D",

    // Warm-neutral & wood-inspired tones (subtle, editorial)
    warm: "#F6F2EA",
    warmSoft: "#EAE1D3",
    woodLight: "#D8B38A",
    wood: "#BC8658",
    woodDeep: "#5A341D",

    // Buttons
    btnBg: "#5A341D",
    btnText: "#FFFFFF",
    btnBgHover: "#434C2C",
    btnTextHover: "#FFFFFF",

    // Footer
    footerBg: "#24231F",
    footerInk: "#F6F2EA",
    footerLink: "#D9CEBE",
    footerLinkHover: "#FFFFFF",
    footerBorder: "#504B40",

    // Semantic
    success: "#626C41",
    danger: "#AF3838",
    badgeCustom: "#626C41",
  },

  // ---------------------------------------------------------------------------
  // Radii
  // ---------------------------------------------------------------------------
  radius: {
    box: "0px",
    card: "10px",
    input: "0px",
    pill: "100px",
  },

  // ---------------------------------------------------------------------------
  // Containers
  // ---------------------------------------------------------------------------
  container: {
    lg: 1760,
    md: 1400,
    sm: 1280,
  },

  // ---------------------------------------------------------------------------
  // Breakpoints (px)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Motion
  // ---------------------------------------------------------------------------
  motion: {
    easeReveal: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
    durationFast: 0.2,
    durationBase: 0.4,
    durationSlow: 0.7,
    revealDistance: 32,
  },
} as const;

export type Tokens = typeof tokens;

/**
 * Backward-compatible alias consumed by Framer Motion variants
 * (lib/motion.ts). Canonical definition lives in this file.
 */
export const theme = tokens;
export type Theme = Tokens;
