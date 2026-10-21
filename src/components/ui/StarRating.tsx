import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";

export function StarRating({ rating, className }: { rating: number; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn("flex items-center gap-0.5", className)} role="img" aria-label={t.a11y.stars(rating)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={16}
          className={i < rating ? "fill-accent text-accent" : "fill-transparent text-line"}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
