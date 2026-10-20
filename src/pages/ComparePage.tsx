import { X } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { PriceTag } from "@/components/ui/PriceTag";
import { ProductMedia } from "@/lib/placeholder";
import { useCompare } from "@/hooks/useCompare";
import { allProducts } from "@/data/products";

const rows: { label: string; render: (p: (typeof allProducts)[number]) => string }[] = [
  { label: "Fiyat", render: () => "" }, // rendered specially below via PriceTag
  { label: "Malzeme", render: (p) => p.material ?? "—" },
  {
    label: "Ölçüler",
    render: (p) => {
      const d = p.dimensions;
      if (!d) return "—";
      return [d.width && `G: ${d.width}${d.unit}`, d.height && `Y: ${d.height}${d.unit}`, d.depth && `D: ${d.depth}${d.unit}`]
        .filter(Boolean)
        .join(" · ") || "—";
    },
  },
  { label: "Yüzey İşlemi", render: (p) => p.finishes?.join(", ") ?? "—" },
  { label: "Montaj", render: (p) => (p.assemblyRequired ? `Gerekli (${p.assemblyTime ?? "belirtilmemiş"})` : "Gerekmiyor") },
  { label: "Üretim Yöntemi", render: (p) => p.productionMethod ?? "—" },
];

export function ComparePage() {
  const { ids, toggle, clear } = useCompare();
  const products = allProducts.filter((p) => ids.includes(p.id));

  return (
    <Section>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>Ürün Karşılaştırma</h1>
          <p className="mt-2 text-sm text-body/60">Şu an mobilya kategorisi için etkin — bir ürün sayfasında "Karşılaştır"a basarak ekleyin.</p>
        </div>
        {products.length > 0 ? (
          <Button variant="outline" onClick={clear}>
            Tümünü Temizle
          </Button>
        ) : null}
      </div>

      {products.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-body/60">Karşılaştırma listeniz boş.</p>
          <Button href="/parametrik-mobilyalar" className="mt-4">
            Mobilyalara göz at
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
                      aria-label={`${p.title} ürününü karşılaştırmadan çıkar`}
                      className="mb-2 flex items-center gap-1 text-xs text-body/50 hover:text-danger"
                    >
                      <X size={12} /> Kaldır
                    </button>
                    <ProductMedia src={p.thumbnail} ratio="square" className="w-24 rounded-card" />
                    <p className="mt-2 font-medium">{p.title}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-line py-4 pr-4 font-medium text-body/60">Fiyat</td>
                {products.map((p) => (
                  <td key={p.id} className="border-b border-line py-4 pr-4">
                    <PriceTag product={p} />
                  </td>
                ))}
              </tr>
              {rows.slice(1).map((row) => (
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
