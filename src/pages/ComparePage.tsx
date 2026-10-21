import { X } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductMedia } from "@/lib/placeholder";
import { useCompare } from "@/hooks/useCompare";
import { allProducts } from "@/data/products";
import { useI18n } from "@/i18n/I18nProvider";

type Product = (typeof allProducts)[number];

export function ComparePage() {
  const { t } = useI18n();
  const { ids, toggle, clear } = useCompare();
  const products = allProducts.filter((p) => ids.includes(p.id));
  const dims = t.product.dims;

  const rows: { label: string; render: (p: Product) => string }[] = [
    { label: t.product.material, render: (p) => p.material ?? "—" },
    {
      label: t.product.dimensions,
      render: (p) => {
        const d = p.dimensions;
        if (!d) return "—";
        return (
          [d.width && `${dims.width}: ${d.width}${d.unit}`, d.height && `${dims.height}: ${d.height}${d.unit}`, d.depth && `${dims.depth}: ${d.depth}${d.unit}`]
            .filter(Boolean)
            .join(" · ") || "—"
        );
      },
    },
    { label: t.options.finish, render: (p) => p.finishes?.join(", ") ?? "—" },
    {
      label: t.product.assembly,
      render: (p) =>
        p.assemblyRequired
          ? `${t.product.assemblyRequired} (${p.assemblyTime ?? t.compare.notSpecified})`
          : t.product.assemblyNotRequired,
    },
    { label: t.product.productionMethod, render: (p) => p.productionMethod ?? "—" },
  ];

  return (
    <Section>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>{t.compare.title}</h1>
          <p className="mt-2 text-sm text-body/60">{t.compare.intro}</p>
        </div>
        {products.length > 0 ? (
          <Button variant="outline" onClick={clear}>
            {t.compare.clearAll}
          </Button>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body/60">{t.compare.empty}</p>
          <Button href="/parametrik-mobilyalar" className="mt-4">
            {t.compare.browse}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-40" />
                {products.map((p) => (
                  <th key={p.id} className="border-b border-line px-4 pb-4 text-left align-bottom">
                    <button
                      onClick={() => toggle(p.id)}
                      aria-label={t.compare.remove(p.title)}
                      className="mb-2 flex items-center gap-1 text-xs text-body/50 hover:text-danger"
                    >
                      <X size={12} /> {t.compare.removeShort}
                    </button>
                    <ProductMedia src={p.thumbnail} ratio="square" className="w-24 rounded-card" />
                    <p className="mt-2 font-medium">{p.title}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-line py-4 pr-4 font-medium text-body/60">{t.catalog.legend.price}</td>
                {products.map((p) => (
                  <td key={p.id} className="border-b border-line py-4 pr-4">
                    <PriceTag product={p} />
                  </td>
                ))}
              </tr>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="border-b border-line py-4 pr-4 font-medium text-body/60">{row.label}</td>
                  {products.map((p) => (
                    <td key={p.id} className="border-b border-line py-4 pr-4">
                      {row.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
