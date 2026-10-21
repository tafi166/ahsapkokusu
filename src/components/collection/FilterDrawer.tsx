import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { Button } from "@/components/ui/Button";
import type { Availability, CategoryFacetConfig, Subcategory } from "@/types";
import { useI18n } from "@/i18n/I18nProvider";

export type SortOption = "featured" | "newest" | "price-asc" | "price-desc" | "best-selling" | "highest-rated";
export type PriceBucket = "under-500" | "500-2000" | "over-2000";

export interface CollectionFilters {
  availability: Availability[];
  price: PriceBucket[];
  material: string[];
  color: string[];
  subcategory: string[];
  layerCount: string[];
}

export const emptyFilters: CollectionFilters = {
  availability: [],
  price: [],
  material: [],
  color: [],
  subcategory: [],
  layerCount: [],
};

export interface AvailableFacetValues {
  material: string[];
  color: string[];
  subcategory: Subcategory[];
  layerCount: number[];
}

const AVAILABILITY: Availability[] = ["in-stock", "made-to-order", "sold-out", "digital"];
const PRICE_BUCKETS: PriceBucket[] = ["under-500", "500-2000", "over-2000"];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function CheckboxGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onToggle,
}: {
  legend: string;
  options: T[];
  labels?: Record<T, string>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium uppercase tracking-wide text-body/60">{legend}</legend>
      <div className="space-y-2">
        {options.map((value) => (
          <label key={value} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onToggle(value)}
              className="h-4 w-4 accent-black"
            />
            {labels?.[value] ?? value}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FilterDrawer({
  open,
  onClose,
  facets,
  availableValues,
  filters,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  facets: CategoryFacetConfig;
  availableValues: AvailableFacetValues;
  filters: CollectionFilters;
  onChange: (filters: CollectionFilters) => void;
}) {
  const { t, money } = useI18n();
  // Buckets are in TRY, the catalog's currency; amounts follow the interface language.
  const priceLabels: Record<PriceBucket, string> = {
    "under-500": t.catalog.priceUnder(money(500, "TRY")),
    "500-2000": t.catalog.priceBetween(money(500, "TRY"), money(2000, "TRY")),
    "over-2000": t.catalog.priceOver(money(2000, "TRY")),
  };
  useScrollLock(open);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t.catalog.filtersDialog}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.455, 0.03, 0.515, 0.955] }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="text-lg">{t.catalog.filterTitle}</h2>
              <button onClick={onClose} aria-label={t.catalog.closeFilters} className="p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
              {facets.availability ? (
                <CheckboxGroup
                  legend={t.catalog.legend.stock}
                  options={AVAILABILITY}
                  labels={t.catalog.availability}
                  selected={filters.availability}
                  onToggle={(v) => onChange({ ...filters, availability: toggle(filters.availability, v) })}
                />
              ) : null}

              {facets.price ? (
                <CheckboxGroup
                  legend={t.catalog.legend.price}
                  options={PRICE_BUCKETS}
                  labels={priceLabels}
                  selected={filters.price}
                  onToggle={(v) => onChange({ ...filters, price: toggle(filters.price, v) })}
                />
              ) : null}

              {facets.subcategory && availableValues.subcategory.length > 0 ? (
                <CheckboxGroup
                  legend={t.catalog.legend.type}
                  options={availableValues.subcategory.map((s) => s.slug)}
                  labels={Object.fromEntries(availableValues.subcategory.map((s) => [s.slug, s.title]))}
                  selected={filters.subcategory}
                  onToggle={(v) => onChange({ ...filters, subcategory: toggle(filters.subcategory, v) })}
                />
              ) : null}

              {facets.layerCount && availableValues.layerCount.length > 0 ? (
                <CheckboxGroup
                  legend={t.catalog.legend.layers}
                  options={availableValues.layerCount.map(String)}
                  labels={Object.fromEntries(availableValues.layerCount.map((n) => [String(n), t.catalog.layers(n)]))}
                  selected={filters.layerCount}
                  onToggle={(v) => onChange({ ...filters, layerCount: toggle(filters.layerCount, v) })}
                />
              ) : null}

              {facets.material && availableValues.material.length > 0 ? (
                <CheckboxGroup
                  legend={t.catalog.legend.material}
                  options={availableValues.material}
                  selected={filters.material}
                  onToggle={(v) => onChange({ ...filters, material: toggle(filters.material, v) })}
                />
              ) : null}

              {facets.color && availableValues.color.length > 0 ? (
                <CheckboxGroup
                  legend={t.catalog.legend.color}
                  options={availableValues.color}
                  selected={filters.color}
                  onToggle={(v) => onChange({ ...filters, color: toggle(filters.color, v) })}
                />
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-line px-6 py-5">
              <Button variant="outline" className="flex-1" onClick={() => onChange(emptyFilters)}>
                {t.catalog.clearAll}
              </Button>
              <Button className="flex-1" onClick={onClose}>
                {t.catalog.apply}
              </Button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
