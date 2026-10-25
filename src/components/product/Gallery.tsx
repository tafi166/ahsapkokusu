import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { ImageCarousel } from "@/components/product/ImageCarousel";
import { ProductMedia } from "@/lib/placeholder";
import { cn } from "@/lib/cn";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);

  return (
    <div>
      <ImageCarousel
        images={images}
        index={active}
        onIndexChange={setActive}
        label={(n) => t.gallery.image(title, n)}
        variant="gallery"
        eager
        className="rounded-card"
      />

      {images.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-3" role="tablist" aria-label={t.gallery.thumbnails(title)}>
          {images.map((image, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={t.gallery.show(i + 1)}
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-input border-2 transition-all duration-300",
                i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <ProductMedia src={image} ratio="square" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
