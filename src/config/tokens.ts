/** Ahşap Kokusu brand palette, mirrored in styles/globals.css. */
export const tokens = {
  // ---------------------------------------------------------------------------
  // Color
  // ---------------------------------------------------------------------------
  color: {
    // Foundation
    paper: "#FAF7F1",
    paperSoft: "#F2ECE2",
    ink: "#1E1915",
    body: "#4A4139",
    line: "#E4DACB",
    divider: "#A5978A",
    mist: "#EAE2D5",

    // Brand accent
    accent: "#B07B4A",
    accentDeep: "#5A341D",

    // Warm-neutral & wood-inspired tones (subtle, editorial)
    warm: "#F2ECE2",
    warmSoft: "#E7DCCB",
    woodLight: "#D8B38A",
    wood: "#B07B4A",
    woodDeep: "#5A341D",
    // Brass highlight for hairlines, eyebrows and ratings
    brass: "#C29A62",

    // Buttons
    btnBg: "#5A341D",
    btnText: "#FFFFFF",
    btnBgHover: "#1E1915",
    btnTextHover: "#FFFFFF",

    // Footer
    footerBg: "#1A1511",
    footerInk: "#F2ECE2",
    footerLink: "#CDBFAE",
    footerLinkHover: "#FFFFFF",
    footerBorder: "#3A3029",

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
    card: "6px",
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
    easeReveal: [0.16, 1, 0.3, 1] as [number, number, number, number],
    durationFast: 0.2,
    durationBase: 0.6,
    durationSlow: 1,
    revealDistance: 28,
  },
} as const;

export type Tokens = typeof tokens;

/**
 * Backward-compatible alias consumed by Framer Motion variants
 * (lib/motion.ts). Canonical definition lives in this file.
 */
export const theme = tokens;
export type Theme = Tokens;
