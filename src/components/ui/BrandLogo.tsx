import { brand } from "@/config/brand";
import { cn } from "@/lib/cn";

/** Original vector artwork, with a separate lockup for dark surfaces. */
export function BrandLogo({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <img
      src={inverse ? "/brand/logo-white.svg" : "/brand/logo-header.svg"}
      alt={brand.name}
      width={inverse ? 1195 : 968}
      height={inverse ? 737 : 260}
      className={cn("block h-auto object-contain", className)}
      decoding="async"
    />
  );
}
