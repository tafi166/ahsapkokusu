import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

const LOCKUPS = {
  stacked: { src: "/brand/logo-stacked.svg", width: 1195, height: 737 },
  inverse: { src: "/brand/logo-white.svg", width: 1195, height: 737 },
  /** AHŞAP · A · KOKUSU on one line, for the header — derived from the stacked artwork. */
  horizontal: { src: "/brand/logo-horizontal.svg", width: 1748.5, height: 320.3 },
} as const;

/** Original vector artwork: stacked, a lockup for dark surfaces, and a one-line header version. */
export function BrandLogo({
  inverse = false,
  horizontal = false,
  className,
}: {
  inverse?: boolean;
  horizontal?: boolean;
  className?: string;
}) {
  const lockup = LOCKUPS[inverse ? "inverse" : horizontal ? "horizontal" : "stacked"];
  return (
    <img
      src={lockup.src}
      alt={brand.name}
      width={lockup.width}
      height={lockup.height}
      className={cn("block h-auto object-contain", className)}
      decoding="async"
    />
  );
}
