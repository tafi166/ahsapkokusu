import type { AdminOverrides } from "@/lib/adminStore";
import type { Category, Product } from "@/types";
import type { ContentTranslations, TranslationKey } from "@/i18n/content/types";

/**
 * Client for the API server (`server/`). Requests go to the same origin —
 * Vite proxies `/api` in development, the web server does in production —
 * so the HttpOnly session cookie travels automatically. The CSRF token is
 * held in memory only and recovered from `/api/auth/me` after a reload.
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let csrfToken: string | null = null;

export async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;
  if (body instanceof Blob) {
    headers["Content-Type"] = body.type;
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  if (method !== "GET" && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "Sunucuya ulaşılamadı. API sunucusunun çalıştığından emin olun.");
  }
  if (!res.ok) throw new ApiError(res.status, await readError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function readError(res: Response): Promise<string> {
  if (res.status === 429) return "Çok fazla deneme yapıldı. Bir dakika sonra tekrar deneyin.";
  if (res.status === 413) return "Dosya çok büyük.";
  try {
    const data = (await res.json()) as { message?: unknown; issues?: { path: string; message: string }[] };
    const issues = data.issues?.map((i) => (i.path ? `${i.path}: ${i.message}` : i.message));
    if (issues && issues.length > 0) return `Geçersiz veri — ${issues.slice(0, 5).join("; ")}`;
    if (typeof data.message === "string") return data.message;
  } catch {
    // not JSON
  }
  if (res.status >= 500) return "Sunucu hatası. Biraz sonra tekrar deneyin.";
  return `İstek başarısız (${res.status}).`;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu.";
}

/** "data:image/jpeg;base64,..." → Blob, for uploading a canvas-resized photo. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error("Görsel verisi okunamadı.");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}

type ContentKey = Exclude<keyof AdminOverrides, "products" | "categories" | "translations" | "settings">;

export type QuoteStatus = "NEW" | "REVIEWING" | "QUOTED" | "CLOSED";

export type MessageStatus = "NEW" | "ANSWERED" | "CLOSED";

/** A message from the contact page, a product's "ask about this" button or the custom-design idea form. */
export interface ContactMessage {
  id: string;
  kind: "CONTACT" | "DESIGN";
  status: MessageStatus;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  productId: string | null;
  productTitle: string | null;
  categorySlug: string | null;
  createdAt: string;
}

export type OrderStatus = "RECEIVED" | "PROCESSING" | "SHIPPED" | "CANCELLED";

export interface StaffOrder {
  id: string;
  number: string;
  isTest: boolean;
  status: OrderStatus;
  currency: "TRY" | "USD";
  subtotal: number;
  customer: { name: string; email: string; phone: string };
  address: { line: string; district: string; city: string; postalCode: string | null } | null;
  notes: string | null;
  lines: { productId: string; productSlug: string; title: string; options: Record<string, string | number>; unitPrice: number; quantity: number; lineTotal: number }[];
  createdAt: string;
}

export interface StaffUser extends AdminUser {
  isActive: boolean;
  createdAt: string;
}

export interface QuoteRequest {
  id: string;
  reference: string;
  status: QuoteStatus;
  widthCm: number;
  heightCm: number;
  material: string;
  quantity: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  notes: string | null;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export const adminApi = {
  /** The signed-in user, or null when there is no live session. */
  async me(): Promise<AdminUser | null> {
    try {
      const res = await request<{ user: AdminUser; csrfToken: string }>("GET", "/api/auth/me");
      csrfToken = res.csrfToken;
      return res.user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },

  async login(email: string, password: string): Promise<AdminUser> {
    const res = await request<{ user: AdminUser; csrfToken: string }>("POST", "/api/auth/login", { email, password });
    csrfToken = res.csrfToken;
    return res.user;
  },

  async logout(): Promise<void> {
    try {
      await request("POST", "/api/auth/logout");
    } finally {
      csrfToken = null;
    }
  },

  saveContent<K extends ContentKey>(key: K, value: NonNullable<AdminOverrides[K]>): Promise<void> {
    return request("PUT", `/api/admin/content/${key}`, { value });
  },

  resetContent(key: ContentKey): Promise<void> {
    return request("DELETE", `/api/admin/content/${key}`);
  },

  saveTranslation<K extends TranslationKey>(locale: "en", key: K, value: NonNullable<ContentTranslations[K]>): Promise<void> {
    return request("PUT", `/api/admin/translations/${locale}/${key}`, { value });
  },

  /** Back to the built-in translation of this block. */
  resetTranslation(locale: "en", key: TranslationKey): Promise<void> {
    return request("DELETE", `/api/admin/translations/${locale}/${key}`);
  },

  /** Every product including hidden drafts — the public catalog leaves those out. */
  listProducts(): Promise<Product[]> {
    return request("GET", "/api/admin/products");
  },

  saveProducts(products: Product[]): Promise<void> {
    return request("PUT", "/api/admin/products", { products });
  },

  saveCategories(categories: Category[]): Promise<void> {
    return request("PUT", "/api/admin/categories", { categories });
  },

  listUsers(): Promise<StaffUser[]> {
    return request("GET", "/api/users");
  },

  createUser(input: { email: string; name: string; role: AdminUser["role"]; password: string }): Promise<StaffUser> {
    return request("POST", "/api/users", input);
  },

  updateUser(id: string, patch: Partial<Pick<StaffUser, "name" | "role" | "isActive">>): Promise<StaffUser> {
    return request("PATCH", `/api/users/${encodeURIComponent(id)}`, patch);
  },

  resetUserPassword(id: string, password: string): Promise<void> {
    return request("POST", `/api/users/${encodeURIComponent(id)}/password`, { password });
  },

  listOrders(): Promise<StaffOrder[]> {
    return request("GET", "/api/admin/orders");
  },

  setOrderStatus(id: string, status: OrderStatus): Promise<StaffOrder> {
    return request("PATCH", `/api/admin/orders/${encodeURIComponent(id)}`, { status });
  },

  listMessages(): Promise<ContactMessage[]> {
    return request("GET", "/api/admin/messages");
  },

  setMessageStatus(id: string, status: MessageStatus): Promise<ContactMessage> {
    return request("PATCH", `/api/admin/messages/${encodeURIComponent(id)}`, { status });
  },

  listQuotes(): Promise<QuoteRequest[]> {
    return request("GET", "/api/admin/quotes");
  },

  setQuoteStatus(id: string, status: QuoteStatus): Promise<QuoteRequest> {
    return request("PATCH", `/api/admin/quotes/${encodeURIComponent(id)}`, { status });
  },

  /** Staff-only download; a plain link works because the session cookie goes along. */
  quoteFileUrl(id: string): string {
    return `/api/admin/quotes/${encodeURIComponent(id)}/file`;
  },

  /** Uploads a resized photo and returns its permanent URL. */
  async uploadImage(dataUrl: string): Promise<string> {
    const { url } = await request<{ url: string }>("POST", "/api/admin/media", dataUrlToBlob(dataUrl));
    return url;
  },
};

export const CONTENT_KEYS: ContentKey[] = [
  "brand",
  "homeContent",
  "announcementMessages",
  "testimonials",
  "trustSignals",
  "partnerLogos",
  "blogPosts",
  "productFaq",
];
