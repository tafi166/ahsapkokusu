import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import type { BadgeKind } from "@/lib/productBadge";

const badgeClass: Record<BadgeKind, string> = {
  sale: "bg-danger text-white",
  new: "bg-ink text-paper",
  bestSeller: "bg-brass text-ink",
  custom: "bg-paper text-accent-deep",
};

export function Badge({ kind, className }: { kind: BadgeKind; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] shadow-sm",
        badgeClass[kind],
        className,
      )}
    >
      {t.badge[kind]}
    </span>
  );
}
