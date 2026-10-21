import { useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { adminApi } from "@/lib/adminApi";
import { resizeImageFiles } from "@/lib/imageResize";
import { isRealImageSrc, ProductMedia } from "@/lib/placeholder";

/**
 * Small, dashboard-flavored form primitives for the admin panel — kept
 * deliberately separate from the marketing site's `components/ui` (which
 * is styled for a storefront, not a data-entry tool).
 */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-black/55">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-black/40">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black shadow-sm focus:border-black/50 focus:outline-none focus:ring-1 focus:ring-black/20";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, props.className)} />;
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#888888"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 shrink-0 cursor-pointer rounded border border-black/15 bg-white p-0.5"
          aria-label={`${label} — renk seçici`}
        />
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

type AdminButtonVariant = "primary" | "outline" | "danger";

export function AdminButton({
  variant = "primary",
  className,
  ...rest
}: { variant?: AdminButtonVariant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClass: Record<AdminButtonVariant, string> = {
    primary: "bg-black text-white hover:bg-black/80",
    outline: "border border-black/20 bg-white text-black hover:bg-black/5",
    danger: "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        className,
      )}
    />
  );
}

export function SavedBanner({ show, onReload, error }: { show: boolean; onReload: () => void; error?: string | null }) {
  if (error) {
    return (
      <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        Kaydedilemedi: {error}
      </div>
    );
  }
  if (!show) return null;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
      <span>Kaydedildi. Sitede görmek için sayfayı yenileyin.</span>
      <AdminButton variant="outline" onClick={onReload}>
        Şimdi Yenile
      </AdminButton>
    </div>
  );
}

/** Add/edit/remove editor for a simple string list (announcements, partner logos, ...). */
export function StringListEditor({
  items,
  onChange,
  itemLabel,
  placeholder,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  itemLabel: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <TextInput
            value={item}
            placeholder={placeholder}
            aria-label={`${itemLabel} ${i + 1}`}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <AdminButton
            type="button"
            variant="danger"
            aria-label={`${itemLabel} ${i + 1} — sil`}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            Sil
          </AdminButton>
        </div>
      ))}
      <AdminButton type="button" variant="outline" onClick={() => onChange([...items, ""])}>
        + {itemLabel} Ekle
      </AdminButton>
    </div>
  );
}

/**
 * Multi-photo gallery control — "browse from disk" (one or many at once),
 * thumbnail grid with reorder-to-front and per-photo remove. Shared by the
 * Products tab (a product's gallery) and the homepage Hero tab (the hero
 * slideshow — see `sections/Hero.tsx`, which turns >1 image into a
 * draggable carousel). Resizes every upload through `resizeImageFiles` so
 * photos are never stretched/distorted and aren't gratuitously
 * over-resolution — see `lib/imageResize.ts`.
 */
export function ImageGalleryField({
  images,
  onChange,
  ratio = "square",
  maxDimension = 1600,
  firstLabel = "Kapak",
  description,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  ratio?: "square" | "portrait" | "landscape" | "wide";
  maxDimension?: number;
  /** What the first image represents for this caller — "Kapak" (product cover) or e.g. "İlk Slayt". */
  firstLabel?: string;
  description?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const dataUrls = await resizeImageFiles(Array.from(fileList), { maxDimension });
      if (dataUrls.length === 0) {
        setError("Seçilen dosyalar görsel olarak tanınmadı.");
        return;
      }
      // Each resized photo is uploaded; the product/hero keeps only the returned URL.
      const urls: string[] = [];
      for (const dataUrl of dataUrls) urls.push(await adminApi.uploadImage(dataUrl));
      // Replace the placeholder swatch (if that's all there is so far) instead of appending after it.
      const isPlaceholderOnly = !images.some(isRealImageSrc);
      onChange(isPlaceholderOnly ? urls : [...images, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Görsel yüklenemedi.");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function moveToFront(index: number) {
    onChange([images[index], ...images.filter((_, i) => i !== index)]);
  }

  return (
    <div className="space-y-3">
      {description ? <p className="text-sm text-black/60">{description}</p> : null}

      {images.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={i} className="w-24 space-y-1">
              <ProductMedia src={img} ratio={ratio} className="rounded-md" />
              <div className="flex justify-center gap-1">
                {i !== 0 ? (
                  <button type="button" onClick={() => moveToFront(i)} className="text-[10px] underline">
                    {firstLabel} Yap
                  </button>
                ) : (
                  <span className="text-[10px] text-black/40">{firstLabel}</span>
                )}
                <button type="button" onClick={() => removeAt(i)} className="text-[10px] text-red-600 underline">
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-black/40">Henüz fotoğraf eklenmedi.</p>
      )}

      <label className="inline-block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-black/55">Fotoğraf Ekle (Bilgisayardan Seç)</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
          className="block text-sm"
        />
      </label>
      {uploading ? <p className="text-sm text-black/50">Fotoğraflar işleniyor ve yükleniyor…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-black/50">{description}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}
