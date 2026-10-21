import { adminApi, CONTENT_KEYS, errorMessage } from "@/lib/adminApi";
import type { AdminOverrides } from "@/lib/adminStore";

export interface ImportResult {
  saved: string[];
  failed: { key: string; error: string }[];
}

/** Uploads an embedded data: image and returns its URL; other sources pass through. */
async function toUploaded(src: string): Promise<string> {
  return src.startsWith("data:image/") ? adminApi.uploadImage(src) : src;
}

/**
 * Saves an exported (or pre-server, browser-stored) set of edits to the API,
 * block by block. Photos embedded as data: URLs — how the old admin panel
 * stored them — are uploaded first, since the server only accepts uploaded
 * files. One block failing doesn't stop the others.
 */
export async function importToServer(overrides: AdminOverrides): Promise<ImportResult> {
  const result: ImportResult = { saved: [], failed: [] };
  const attempt = async (key: string, save: () => Promise<void>) => {
    try {
      await save();
      result.saved.push(key);
    } catch (e) {
      result.failed.push({ key, error: errorMessage(e) });
    }
  };

  if (overrides.categories) {
    const categories = overrides.categories;
    await attempt("categories", () => adminApi.saveCategories(categories));
  }
  if (overrides.products) {
    const products = overrides.products;
    await attempt("products", async () => {
      const uploaded = [];
      for (const p of products) {
        const images = [];
        for (const img of p.images) images.push(await toUploaded(img));
        uploaded.push({ ...p, images, thumbnail: await toUploaded(p.thumbnail) });
      }
      await adminApi.saveProducts(uploaded);
    });
  }
  for (const key of CONTENT_KEYS) {
    const value = overrides[key];
    if (value === undefined) continue;
    await attempt(key, async () => {
      if (key === "homeContent") {
        const home = value as NonNullable<AdminOverrides["homeContent"]>;
        const images = home.hero?.images;
        if (images) {
          const hero = { ...home.hero, images: await Promise.all(images.map(toUploaded)) };
          await adminApi.saveContent("homeContent", { ...home, hero });
          return;
        }
      }
      await adminApi.saveContent(key, value as never);
    });
  }
  return result;
}

/** "Data file" → parsed edits, rejecting anything that isn't a JSON object. */
export function parseBackup(text: string): AdminOverrides {
  const parsed: unknown = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Geçersiz yedek dosyası: bir JSON nesnesi bekleniyor.");
  }
  return parsed as AdminOverrides;
}
