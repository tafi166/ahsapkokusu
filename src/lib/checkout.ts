import type { CartLine } from "@/hooks/useCart";
import type { FieldErrors } from "@/lib/cncQuote";
import type { ConfiguredOptions } from "@/types";

export interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  line: string;
  district: string;
  city: string;
  postalCode: string;
  notes: string;
}

/** Same rules the API applies (server/src/orders/orders.schemas.ts). */
export function validateCheckout(f: CheckoutForm, needsShipping: boolean): FieldErrors<keyof CheckoutForm> {
  const errors: FieldErrors<keyof CheckoutForm> = {};
  if (!f.name.trim()) errors.name = "Adınızı girin.";
  else if (f.name.trim().length > 100) errors.name = "En fazla 100 karakter.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errors.email = "Geçerli bir e-posta adresi girin.";
  if (!/^\+?[\d\s()-]{7,20}$/.test(f.phone.trim())) errors.phone = "Geçerli bir telefon numarası girin.";
  if (needsShipping) {
    if (f.line.trim().length < 5) errors.line = "Açık adresi girin.";
    if (!f.district.trim()) errors.district = "İlçeyi girin.";
    if (!f.city.trim()) errors.city = "İli girin.";
    if (f.postalCode.trim() && !/^\d{5}$/.test(f.postalCode.trim())) errors.postalCode = "Posta kodu 5 haneli olmalı.";
  }
  if (f.notes.length > 1000) errors.notes = "En fazla 1000 karakter.";
  return errors;
}

export interface PlacedOrder {
  number: string;
  isTest: boolean;
  currency: "TRY" | "USD";
  subtotal: number;
  lines: { title: string; options: ConfiguredOptions; unitPrice: number; quantity: number; lineTotal: number }[];
}

export type PlaceOrderResult = { ok: true; order: PlacedOrder } | { ok: false; message: string };

/** Sends the cart as product ids, quantities and options only — the server prices it. */
export async function placeOrder(lines: CartLine[], form: CheckoutForm, needsShipping: boolean): Promise<PlaceOrderResult> {
  const body = {
    lines: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, ...(l.selection ? { selection: l.selection } : {}) })),
    customer: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
    ...(needsShipping
      ? { address: { line: form.line.trim(), district: form.district.trim(), city: form.city.trim(), postalCode: form.postalCode.trim() } }
      : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
  };

  let res: Response;
  try {
    res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, message: "Sunucuya ulaşılamadı — sipariş verilmedi. Lütfen biraz sonra tekrar deneyin." };
  }
  if (res.ok) return { ok: true, order: (await res.json()) as PlacedOrder };
  if (res.status === 429) return { ok: false, message: "Çok fazla deneme yapıldı. Bir dakika sonra tekrar deneyin." };
  try {
    const data = (await res.json()) as { message?: unknown };
    if (typeof data.message === "string" && res.status < 500) return { ok: false, message: data.message };
  } catch {
    // not JSON
  }
  return { ok: false, message: "Sipariş verilemedi. Lütfen biraz sonra tekrar deneyin." };
}
