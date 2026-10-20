export interface ResizeOptions {
  /** Longest side is capped at this many pixels. Smaller originals are never upscaled. */
  maxDimension?: number;
  /** JPEG quality, 0–1. */
  quality?: number;
}

/**
 * Reads an image file chosen from disk and re-encodes it through a
 * `<canvas>` as a JPEG data URL, for the admin panel's product photo
 * upload (see `ProductsTab.tsx`).
 *
 * Two things this guarantees, both directly because the canvas is always
 * sized in the source's exact width:height ratio:
 * - **Never stretched/squashed**: `width`/`height` are computed from a
 *   single uniform `scale` factor applied to both axes, so the drawn
 *   image always keeps the original proportions on both axes.
 * - **Resolution isn't gratuitously degraded**: originals at or under
 *   `maxDimension` are re-encoded at their native size (scale caps at 1,
 *   it never upscales); only photos larger than that are downscaled, and
 *   only enough to fit — this also keeps a single photo from blowing past
 *   localStorage's quota once a product carries several of them.
 *
 * Where the browser actually crops to fit a card/box, that's `object-fit:
 * cover` in `ProductMedia` (`lib/placeholder.tsx`) — cropping trims
 * overflow but, like this function, never distorts the aspect ratio.
 */
export function resizeImageFile(file: File, options: ResizeOptions = {}): Promise<string> {
  const { maxDimension = 1600, quality = 0.85 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error(`"${file.name}" bir görsel olarak açılamadı — dosya bozuk olabilir.`));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Tarayıcı canvas'ı desteklemiyor."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Resize every file in a FileList/array, skipping non-images, in parallel. */
export async function resizeImageFiles(files: File[], options?: ResizeOptions): Promise<string[]> {
  const imageFiles = files.filter((f) => f.type.startsWith("image/"));
  return Promise.all(imageFiles.map((f) => resizeImageFile(f, options)));
}
