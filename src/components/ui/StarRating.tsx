import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} role="img" aria-label={`${rating} out of 5 stars`}>
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
