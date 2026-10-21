import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";

interface PlaceholderMediaProps {
  /** Base color used to derive the gradient/pattern — see data/*.ts `swatch` fields. */
  swatch: string;
  label?: string;
  className?: string;
  ratio?: "square" | "portrait" | "landscape" | "wide";
}

const ratioClass: Record<NonNullable<PlaceholderMediaProps["ratio"]>, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  wide: "aspect-[16/9]",
};

/**
 * Stand-in for real product/lifestyle photography.
 *
 * The reference site's imagery is copyrighted product photography we
 * can't (and shouldn't) reproduce. This renders a deterministic,
 * on-brand gradient tile instead, sized to the same aspect ratios the
 * real cards use — swap for <img>/<picture> once real assets exist,
 * without touching any layout code that renders this component.
 */
export function PlaceholderMedia({ swatch, label, className, ratio = "square" }: PlaceholderMediaProps) {
  const { t } = useI18n();
  return (
    <div
      role="img"
      aria-label={label ?? t.gallery.placeholder}
      className={cn(
        "relative overflow-hidden bg-mist",
        ratioClass[ratio],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${swatch}33 0%, ${swatch} 100%)`,
      }}
    >
      <div className="absolute inset-0 opacity-20 mix-blend-overlay [background-image:repeating-linear-gradient(45deg,#fff_0,#fff_1px,transparent_1px,transparent_10px)]" />
      {label ? (
        <span className="absolute bottom-2 left-2 rounded-full bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wide text-white/80">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/** A hex swatch (`#2b2b2b`) is a placeholder; anything else is a real image source. */
export function isRealImageSrc(src: string): boolean {
  return /^(data:image\/|https?:\/\/|\/|blob:)/.test(src);
}

interface ProductMediaProps {
  /** Either a real image source (uploaded via the admin panel — see `lib/imageResize.ts`) or a swatch hex color. */
  src: string;
  /**
   * On a real photo this is only the `alt` text (never shown visibly).
   * On the swatch fallback it's also rendered as a visible "placeholder"
   * caption — that's intentional there (a dev-facing hint of what real
   * photo belongs in the slot) but would look wrong overlaid on an
   * actual photo, so it's deliberately dropped once `src` is real.
   */
  label?: string;
  className?: string;
  ratio?: PlaceholderMediaProps["ratio"];
}

/**
 * Renders a real product photo when `src` is one, falling back to the
 * gradient swatch placeholder otherwise — so seed data (still plain hex
 * swatches) keeps rendering unchanged, while admin-uploaded photos show up
 * automatically the moment a product's `images`/`thumbnail` contain one.
 *
 * Uses `object-cover` inside a fixed aspect-ratio box: the photo is
 * scaled uniformly to fill the box (cropping any overflow evenly) and is
 * *never* stretched non-uniformly on either axis. Pair with
 * `resizeImageFile` (`lib/imageResize.ts`) when accepting an upload —
 * that's what keeps the source resolution from being degraded.
 */
export function ProductMedia({ src, label, className, ratio = "square" }: ProductMediaProps) {
  if (!isRealImageSrc(src)) {
    return <PlaceholderMedia swatch={src} label={label} ratio={ratio} className={className} />;
  }
  return (
    <div className={cn("relative overflow-hidden bg-mist", ratioClass[ratio], className)}>
      <img src={src} alt={label ?? ""} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
    </div>
  );
}
