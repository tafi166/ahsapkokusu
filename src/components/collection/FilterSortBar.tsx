import { SlidersHorizontal } from "lucide-react";
import type { SortOption } from "@/components/collection/FilterDrawer";

const sortLabels: Record<SortOption, string> = {
  featured: "Öne Çıkanlar",
  newest: "En Yeniler",
  "price-asc": "Fiyat: Düşükten Yükseğe",
  "price-desc": "Fiyat: Yüksekten Düşüğe",
  "best-selling": "Çok Satanlar",
  "highest-rated": "En Yüksek Puan",
};

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
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4 text-sm">
      <button
        onClick={onOpenFilters}
        className="flex items-center gap-2 rounded-full border border-line px-4 py-2 transition-colors hover:border-ink"
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        Filtrele ve Sırala
        {activeFilterCount > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] text-white">
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      <div className="flex items-center gap-4">
        <span className="text-body/60">{count} ürün</span>
        <label className="flex items-center gap-2">
          <span className="text-body/60">Sırala</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="rounded-input border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
          >
            {(Object.keys(sortLabels) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
