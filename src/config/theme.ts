/**
 * Backward-compatible token surface.
 *
 * Canonical design tokens now live in ./tokens.ts (single source of truth,
 * mirrored by the @theme block in styles/globals.css). This file re-exports
 * them as `theme` / `Theme` so existing consumers — lib/motion.ts — keep
 * working without duplication between the JS and CSS token layers.
 */
import { tokens, type Tokens } from "./tokens";

export const theme = tokens;
export type Theme = Tokens;
export type { Tokens };
