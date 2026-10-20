import { clsx, type ClassValue } from "clsx";

/** Thin wrapper so components import one helper instead of clsx directly. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
