/**
 * Single source of truth for PARAMETRIKSANAT design tokens.
 *
 * Kept in sync with the `@theme` block in styles/globals.css. Tokens are
 * defined here (TypeScript) and mirrored in CSS so component styles and
 * Framer Motion variants share one canonical set of values.
 *
 * Visual direction (approved): white / warm-neutral foundation, controlled
 * black and gold accents, subtle wood-inspired tones, premium editorial feel.
 * Treat the initial palette as a starting point — validate against real
 * product imagery before treating any value as immutable.
 */
export const tokens = {
  // ---------------------------------------------------------------------------
  // Color
  // ---------------------------------------------------------------------------
  color: {
    // Foundation
    paper: "#ffffff",        // pure white surface
    paperSoft: "#f8f8f8",    // off-white panel
    ink: "#000000",          // black — headings, primary buttons
    body: "#282828",         // body text
    line: "#f1f1f1",         // hairlines
    divider: "#cccccc",      // stronger divider
    mist: "#f1f1f1",         // placeholder media background

    // Brand accent
    accent: "#ffc400",       // gold
    accentDeep: "#5c0000",   // maroon — accent hover

    // Warm-neutral & wood-inspired tones (subtle, editorial)
    warm: "#f5f1ea",         // warm paper
    warmSoft: "#eae4d8",     // warm panel
    woodLight: "#d8c3a5",    // oak
    wood: "#a67c52",         // walnut
    woodDeep: "#5c4632",     // deep walnut

    // Buttons
    btnBg: "#000000",
    btnText: "#ffffff",
    btnBgHover: "#dfdfdf",
    btnTextHover: "#000000",

    // Footer
    footerBg: "#000000",
    footerInk: "#ffffff",
    footerLink: "#cfd0d4",
    footerLinkHover: "#cccccc",
    footerBorder: "#0e0f15",

    // Semantic
    success: "#126e00",
    danger: "#ec7979",
    badgeCustom: "#6ea1f5",
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
