import { cn } from "@/lib/cn";
import type { BadgeKind } from "@/lib/productBadge";

const badgeClass: Record<BadgeKind, string> = {
  "İndirim": "bg-danger text-white",
  "Yeni": "bg-black text-white",
  "Çok Satan": "bg-accent text-ink",
  "Özel Tasarım": "bg-badge-custom text-white",
};

export function Badge({ kind, className }: { kind: BadgeKind; className?: string }) {
  return (
    <span
      className={cn(
        "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
        badgeClass[kind],
        className,
      )}
    >
      {kind}
    </span>
  );
}
