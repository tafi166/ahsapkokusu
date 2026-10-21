import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductCard } from "@/components/ui/ProductCard";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { FilterSortBar } from "@/components/collection/FilterSortBar";
import {
  FilterDrawer,
  emptyFilters,
  type AvailableFacetValues,
  type CollectionFilters,
  type SortOption,
} from "@/components/collection/FilterDrawer";
import { categories } from "@/data/categories";
import { getProductsByCategory } from "@/data/products";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useSeo, breadcrumbJsonLd } from "@/lib/seo";
import { ProductMedia } from "@/lib/placeholder";
import { NotFoundPage } from "@/pages/NotFoundPage";
import type { Category, Product } from "@/types";
import { useI18n } from "@/i18n/I18nProvider";
import { categoryBySegment, categoryPath } from "@/i18n/paths";

const PAGE_SIZE = 8;

function matchesFilters(product: Product, filters: CollectionFilters): boolean {
  if (filters.availability.length > 0 && !filters.availability.includes(product.availability)) return false;
  if (filters.price.length > 0) {
    const bucket = product.price < 500 ? "under-500" : product.price <= 2000 ? "500-2000" : "over-2000";
    if (!filters.price.includes(bucket)) return false;
  }
  if (filters.subcategory.length > 0 && !(product.subcategory && filters.subcategory.includes(product.subcategory)))
    return false;
  if (filters.layerCount.length > 0 && !(product.layerCount && filters.layerCount.includes(String(product.layerCount))))
    return false;
  if (filters.material.length > 0 && !(product.material && filters.material.includes(product.material))) return false;
  if (filters.color.length > 0 && !product.colors?.some((c) => filters.color.includes(c))) return false;
  return true;
}

function sortProducts(products: Product[], sort: SortOption): Product[] {
  const copy = [...products];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "newest":
      return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case "best-selling":
      return copy.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
    case "highest-rated":
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    default:
      return copy.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
}

/**
 * Thin wrapper: reads the route param + `?alt=` query param and remounts
 * `CategoryPageView` (via `key`) whenever either changes.
 *
 * This matters because `/parametrik-duvar-tablolari` and
 * `/parametrik-duvar-tablolari?alt=hayvan-figurleri` — or two different
 * category slugs — match the *same* route element, so React Router
 * re-renders the existing CategoryPageView instance instead of mounting a
 * new one. Without the key, its filter/sort/pagination state (seeded once
 * from the initial `alt` value) would silently carry over instead of
 * resetting, which is exactly what made subcategory links look like they
 * changed the URL but not the page.
 */
export function CategoryPage() {
  const { categorySlug = "" } = useParams<{ categorySlug: string }>();
  const [searchParams] = useSearchParams();
  return <CategoryPageView key={`${categorySlug}?${searchParams.get("alt") ?? ""}`} categorySlug={categorySlug} />;
}

function CategoryPageView({ categorySlug }: { categorySlug: string }) {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const category = categoryBySegment(categorySlug);

  const [filters, setFilters] = useState<CollectionFilters>(() => {
    const alt = searchParams.get("alt");
    return alt ? { ...emptyFilters, subcategory: [alt] } : emptyFilters;
  });
  const [sort, setSort] = useState<SortOption>("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const baseProducts = useMemo(() => (category ? getProductsByCategory(category.slug) : []), [category]);

  const availableValues: AvailableFacetValues = useMemo(
    () => ({
      material: [...new Set(baseProducts.map((p) => p.material).filter((v): v is string => Boolean(v)))],
      color: [...new Set(baseProducts.flatMap((p) => p.colors ?? []))],
      subcategory: category?.subcategories.filter((s) => baseProducts.some((p) => p.subcategory === s.slug)) ?? [],
      layerCount: [...new Set(baseProducts.map((p) => p.layerCount).filter((v): v is number => Boolean(v)))].sort(
        (a, b) => a - b,
      ),
    }),
    [baseProducts, category],
  );

  const filtered = useMemo(
    () => sortProducts(baseProducts.filter((p) => matchesFilters(p, filters)), sort),
    [baseProducts, filters, sort],
  );

  const seoTitle = category?.seoTitle ?? category?.title ?? t.catalog.fallbackTitle;
  const seoDescription = category?.seoDescription ?? category?.description;
  useSeo({
    title: seoTitle,
    description: seoDescription,
    jsonLd: category ? breadcrumbJsonLd([{ label: t.product.home, href: "/" }, { label: category.title, href: categoryPath(category) }]) : undefined,
  });

  if (!category) return <NotFoundPage />;

  const visible = filtered.slice(0, visibleCount);
  const activeFilterCount =
    filters.availability.length +
    filters.price.length +
    filters.material.length +
    filters.color.length +
    filters.subcategory.length +
    filters.layerCount.length;

  function handleFiltersChange(next: CollectionFilters) {
    setFilters(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSortChange(next: SortOption) {
    setSort(next);
    setVisibleCount(PAGE_SIZE);
  }

  const relatedCategories = categories.filter((c: Category) => c.slug !== category.slug).slice(0, 4);

  return (
    <>
      <div className="relative flex h-56 items-end overflow-hidden md:h-72">
        <div className="absolute inset-0">
          <ProductMedia src={category.heroImage ?? category.heroSwatch} ratio="fill" eager className="h-full w-full" />
        </div>
        <div className="absolute inset-0 bg-black/45" aria-hidden="true" />
        <div className="relative z-10 w-full pb-8">
          <div className="mx-auto w-full max-w-[1760px] px-4 md:px-8">
            <h1 className="text-white">{category.title}</h1>
          </div>
        </div>
      </div>

      <Section pageTop>
        <Breadcrumb items={[{ label: t.product.home, href: "/" }, { label: category.title }]} />

        <div className="mb-8 max-w-2xl">
          <p className="text-sm text-body/70">{category.description}</p>
        </div>

        <FilterSortBar
          count={filtered.length}
          sort={sort}
          onSortChange={handleSortChange}
          onOpenFilters={() => setFilterOpen(true)}
          activeFilterCount={activeFilterCount}
        />
        <FilterDrawer
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          facets={category.facets}
          availableValues={availableValues}
          filters={filters}
          onChange={handleFiltersChange}
        />

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-body/60">{t.catalog.noMatch}</p>
            <Button variant="outline" className="mt-4" onClick={() => handleFiltersChange(emptyFilters)}>
              {t.catalog.clearFilters}
            </Button>
          </div>
        ) : (
          <>
            <motion.ul
              key={`${category.slug}-${sort}-${activeFilterCount}`}
              initial="hidden"
              animate="visible"
              variants={staggerContainer(0.06)}
              className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
            >
              {visible.map((product) => (
                <motion.li key={product.id} variants={fadeUp}>
                  <ProductCard product={product} />
                </motion.li>
              ))}
            </motion.ul>

            {visibleCount < filtered.length ? (
              <div className="mt-10 text-center">
                <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                  {t.catalog.showMore}
                </Button>
              </div>
            ) : null}
          </>
        )}

        {category.faq.length > 0 ? (
          <div className="mx-auto mt-20 max-w-2xl border-t border-line pt-14">
            <h2 className="mb-6">{t.catalog.faq}</h2>
            {category.faq.map((item) => (
              <AccordionSection key={item.question} title={item.question}>
                <p>{item.answer}</p>
              </AccordionSection>
            ))}
          </div>
        ) : null}

        <div className="mt-16 border-t border-line pt-10">
          <h2 className="mb-6 text-lg">{t.catalog.related}</h2>
          <div className="flex flex-wrap gap-3">
            {relatedCategories.map((c) => (
              <Button key={c.slug} href={categoryPath(c)} variant="outline" size="sm">
                {c.title}
              </Button>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
