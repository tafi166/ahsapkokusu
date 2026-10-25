import { z } from "zod";
export const idSchema = z.string().uuid();
export const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "HTTPS kaynak bağlantısı girin.");
export const batchInput = z
  .object({
    title: z.string().trim().min(1).max(160),
    sourceUrl: httpsUrl,
    permissionBasis: z.enum(["OWNED", "AUTHORIZED"]),
    permissionNote: z.string().trim().min(5).max(2000),
    permissionUntil: z
      .string()
      .datetime()
      .nullable()
      .refine(
        (v) => !v || Date.parse(v) > Date.now(),
        "İzin tarihi geçmiş olamaz.",
      ),
    confirmed: z.literal(true),
  })
  .strict();
export const exportInput = z
  .object({
    imageIds: z
      .array(idSchema)
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict();
export const inspectInput = z.object({ url: httpsUrl }).strict();
/** Parse only, never fetch arbitrary URLs or bypass platform access controls. */
export function inspectEtsyUrl(url: string) {
  const u = new URL(url);
  if (!["etsy.com", "www.etsy.com"].includes(u.hostname) || u.port)
    return {
      available: false,
      kind: "unsupported",
      message:
        "Etsy mağaza veya ürün bağlantısı girin. Görselleri aşağıdan yükleyebilirsiniz.",
    };
  const listing = u.pathname.match(/^\/(?:[a-z]{2}\/)?listing\/(\d+)(?:\/|$)/);
  const shop = u.pathname.match(
    /^\/(?:[a-z]{2}\/)?shop\/([A-Za-z0-9_-]+)(?:\/|$)/,
  );
  return {
    available: false,
    kind: listing ? "listing" : shop ? "shop" : "unsupported",
    reference: listing?.[1] ?? shop?.[1] ?? null,
    message:
      "Etsy bağlantısından otomatik alma henüz kullanılamıyor: onaylı ve koşullara uygun erişim sağlayıcısı bağlı değil. Elinizdeki yetkili görselleri yükleyerek devam edin.",
  };
}
