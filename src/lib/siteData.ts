import type { AdminOverrides } from "@/lib/adminStore";

/**
 * Fetches the site snapshot (catalog + edited content) from the API server.
 * Returns null when the server is unreachable, slow or answers with
 * something unexpected — the storefront then runs on its built-in defaults
 * rather than showing nothing.
 */
export async function fetchSiteSnapshot(timeoutMs = 4000): Promise<AdminOverrides | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("/api/site", { signal: controller.signal, credentials: "same-origin" });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isSnapshot(data)) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isSnapshot(data: unknown): data is AdminOverrides {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const { products, categories } = data as Record<string, unknown>;
  // The server always includes both; an empty catalog (unseeded database) means "use the defaults".
  return Array.isArray(products) && Array.isArray(categories) && products.length > 0 && categories.length > 0;
}
