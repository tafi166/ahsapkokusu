import { loadOverrides } from "@/lib/adminStore";

/**
 * Whether the site takes (test) orders — the API server's ORDERS_ENABLED. When
 * off, or when the server can't be reached, the site runs in catalog mode: no
 * cart or checkout, and every product links to the contact form instead.
 */
export function ordersEnabled(): boolean {
  return loadOverrides().settings?.ordersEnabled === true;
}

/** The newsletter form stays hidden until an e-mail service exists: it would only pretend to subscribe. */
export const NEWSLETTER_ENABLED = false;
