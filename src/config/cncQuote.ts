/**
 * CNC quote request settings.
 *
 * PROVISIONAL — the limits below are placeholders chosen for the prototype,
 * not confirmed machine or business limits. Replace them with real values
 * (machine bed size, accepted file size, order quantities) before launch.
 * The server will enforce its own limits in Phase 3; these only drive the
 * client-side feedback.
 */
export const cncQuoteConfig = {
  limitsConfirmed: false,
  maxFileBytes: 5 * 1024 * 1024,
  /** Finished piece size, in cm. */
  minSizeCm: 5,
  maxSizeCm: 300,
  minQuantity: 1,
  maxQuantity: 100,
  /** Materials already offered in the catalog; no thickness choice yet. */
  materials: ["MDF", "Kontrplak", "Masif Ahşap", "Masif Meşe", "MDF Lam"],
} as const;

export type CncMaterial = (typeof cncQuoteConfig.materials)[number];
