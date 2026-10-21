import { SlidersHorizontal } from "lucide-react";
import type { SortOption } from "@/components/collection/FilterDrawer";
import { useI18n } from "@/i18n/I18nProvider";

const SORT_OPTIONS: SortOption[] = ["featured", "newest", "price-asc", "price-desc", "best-selling", "highest-rated"];

export function FilterSortBar({
  count,
  sort,
  onSortChange,
  onOpenFilters,
  activeFilterCount,
}: {
  count: number;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
}) {
  const { t } = useI18n();
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 text-sm">
      <button
        onClick={onOpenFilters}
        className="flex items-center gap-2 rounded-full border border-line px-4 py-2 transition-colors hover:border-ink"
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        {t.catalog.filterAndSort}
        {activeFilterCount > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      <div className="flex items-center gap-4">
        <span className="text-body/60">{t.catalog.count(count)}</span>
        <label className="flex items-center gap-2">
          <span className="text-body/60">{t.catalog.sortLabel}</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="rounded-input border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          >
            {SORT_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {t.catalog.sort[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
