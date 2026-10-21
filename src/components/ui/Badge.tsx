import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import type { BadgeKind } from "@/lib/productBadge";

const badgeClass: Record<BadgeKind, string> = {
  sale: "bg-danger text-white",
  new: "bg-black text-white",
  bestSeller: "bg-accent text-ink",
  custom: "bg-badge-custom text-white",
};

export function Badge({ kind, className }: { kind: BadgeKind; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
        badgeClass[kind],
        className,
      )}
    >
      {t.badge[kind]}
    </span>
  );
}
