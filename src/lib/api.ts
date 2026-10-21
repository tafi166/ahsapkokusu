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

/** Shown by the forms that are still mocks (contact, free-text design request) — nothing is sent or stored. */
export const PROTOTYPE_NOTICE = "Bu bir prototiptir — form doğrulandı ancak hiçbir yere gönderilmedi ve saklanmadı.";

export interface CncQuotePayload {
  /** The chosen SVG — kept in memory by the form and sent only here. */
  file: File;
  details: QuoteDetails;
  contact: ContactDetails;
}

export type CncQuoteResult = { ok: true; reference: string } | { ok: false; message: string };

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

  /**
   * Sends a quote request to the API server (multipart: the SVG plus the form
   * fields). Fields are checked here first so an obviously incomplete request
   * never leaves the browser; the server validates everything again.
   */
  async submitCncQuote(payload: CncQuotePayload): Promise<CncQuoteResult> {
    const invalid =
      Object.keys(validateDetails(payload.details)).length > 0 || Object.keys(validateContact(payload.contact)).length > 0;
    if (invalid) return { ok: false, message: "Talep eksik veya geçersiz — lütfen adımları kontrol edin." };

    const form = new FormData();
    const { details, contact } = payload;
    for (const [key, value] of Object.entries({ ...details, ...contact })) form.append(key, value);
    form.append("file", payload.file, payload.file.name);

    let res: Response;
    try {
      res = await fetch("/api/quotes", { method: "POST", body: form, credentials: "same-origin" });
    } catch {
      return { ok: false, message: "Sunucuya ulaşılamadı — talebiniz gönderilmedi. Lütfen biraz sonra tekrar deneyin." };
    }
    if (res.ok) {
      const data = (await res.json()) as { reference?: unknown };
      if (typeof data.reference === "string") return { ok: true, reference: data.reference };
      return { ok: false, message: "Sunucudan beklenmeyen bir yanıt geldi." };
    }
    if (res.status === 429) return { ok: false, message: "Çok fazla talep gönderildi. Bir dakika sonra tekrar deneyin." };
    if (res.status === 413) return { ok: false, message: "Dosya çok büyük." };
    try {
      const data = (await res.json()) as { message?: unknown };
      if (typeof data.message === "string" && res.status < 500) return { ok: false, message: data.message };
    } catch {
      // not JSON
    }
    return { ok: false, message: "Talep gönderilemedi. Lütfen biraz sonra tekrar deneyin." };
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
