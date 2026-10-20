/**
 * Mock API / service layer.
 * -----------------------------------------------------------------------
 * The reference site's real backend (Shopify's cart, checkout, account
 * and search APIs) is not observable from the outside, so this layer
 * simulates the same *contract* with local mock data and artificial
 * latency. Swap the implementations below for real fetch() calls to a
 * Storefront API, your own backend, etc. — nothing above this layer
 * (components/hooks) needs to change.
 */
import { allProducts } from "@/data/products";
import { validateContact, validateDetails, type ContactDetails, type QuoteDetails } from "@/lib/cncQuote";
import type { Product } from "@/types";

/** Shown wherever a mock form "succeeds" — nothing is sent or stored until the Phase 3 backend exists. */
export const PROTOTYPE_NOTICE = "Bu bir prototiptir — form doğrulandı ancak hiçbir yere gönderilmedi ve saklanmadı.";

export interface CncQuotePayload {
  /** File name and size only — the file itself is never sent by the prototype. */
  file: { name: string; size: number };
  details: QuoteDetails;
  contact: ContactDetails;
}

export type CncQuoteResult = { ok: true; reference: string } | { ok: false; message: string };

function demoReference(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `DEMO-${random.toUpperCase()}`;
}

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface NewsletterSubscribeResult {
  ok: boolean;
  message: string;
}

export const api = {
  async subscribeToNewsletter(email: string): Promise<NewsletterSubscribeResult> {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      return delay({ ok: false, message: "Lütfen geçerli bir e-posta adresi girin." }, 300);
    }
    return delay({ ok: true, message: "Listeye eklendiniz! Karşılama e-postamızı gelen kutunuzda kontrol edin." });
  },

  async submitContactForm(payload: {
    name: string;
    email: string;
    message: string;
  }): Promise<{ ok: boolean; message: string }> {
    if (!payload.name.trim() || !payload.email.trim() || !payload.message.trim()) {
      return delay({ ok: false, message: "Göndermeden önce lütfen tüm alanları doldurun." }, 300);
    }
    return delay({ ok: true, message: PROTOTYPE_NOTICE });
  },

  /** Re-validates like the real server will; returns a DEMO reference. Nothing leaves the browser. */
  async submitCncQuote(payload: CncQuotePayload): Promise<CncQuoteResult> {
    const invalid =
      !payload.file.name ||
      Object.keys(validateDetails(payload.details)).length > 0 ||
      Object.keys(validateContact(payload.contact)).length > 0;
    if (invalid) {
      return delay({ ok: false, message: "Talep eksik veya geçersiz — lütfen adımları kontrol edin." }, 300);
    }
    return delay({ ok: true, reference: demoReference() });
  },

  /** Searches title, category, subcategory, tags and description — mirrors a real full-text product search. */
  async searchProducts(query: string): Promise<Product[]> {
    const q = query.trim().toLowerCase();
    if (!q) return delay([], 150);
    const results = allProducts.filter((p) =>
      [p.title, p.category, p.subcategory, p.description, ...p.tags].some((field) =>
        field?.toLowerCase().includes(q),
      ),
    );
    return delay(results, 350);
  },
};
