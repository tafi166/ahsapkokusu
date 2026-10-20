# Category Mapping — Etsy Product Types → Our 5 Categories

`etsy.com/shop/ParametricArtWood` blocks all automated access (DataDome/CAPTCHA
wall on every request, confirmed via both WebFetch and direct `curl`), so this
mapping is built from the product-type vocabulary supplied in the task brief
itself (which came from browsing that shop) plus standard parametric-wood-art
domain knowledge — not a scraped listing export.

| Etsy product type | → Our category | Subcategory |
|---|---|---|
| Parametric Wall Art / Human Face / Human Body | Parametrik Duvar Tabloları | Portre & Figür |
| Parametric Jaguar, Octopus (animal figures) | Parametrik Duvar Tabloları | Hayvan Figürleri |
| Parametric Aircraft, Sports Car, Formula Race Car | Parametrik Duvar Tabloları | Araç & Motor Sporları |
| Abstract / Geometric / Organic Wall Art | Parametrik Duvar Tabloları | Soyut & Geometrik |
| Special Wall Art (one-off/custom pieces) | Parametrik Duvar Tabloları | Özel Tasarımlar |
| *(no direct Etsy equivalent — brief specifies this as our own line)* | Katmanlı Multilayer Tablolar | 3/5/7/9/11 Katman |
| Parametric Chair, Bar Stool | Parametrik Mobilyalar | Sandalye & Tabure |
| Parametric Coffee Table, Dining Table | Parametrik Mobilyalar | Sehpa & Masa |
| Parametric Shelf, TV Unit | Parametrik Mobilyalar | Raf & TV Ünitesi |
| Parametric Reception Desk, Office Desk | Parametrik Mobilyalar | Resepsiyon & Ofis |
| Parametric Bench, Sculptural Seating | Parametrik Mobilyalar | Bench & Oturma Grupları |
| Parametric Wall Clock | Duvar Saatleri | Geometrik / Minimal / Büyük Boy (by design, not an Etsy split) |
| Parametric Decorative Objects | Dekorlar | Heykeller / Küçük Objeler |
| *(implied by "Lighting-related decorative products" in the brief)* | Dekorlar | Aydınlatma Aksesuarları |
| *(new — panels don't fit Wall Art's figurative/abstract framing)* | Dekorlar | Dekoratif Paneller |
| **Custom Works** | **Needs Review** | Not force-fit into one category — routed to its own `/ozel-tasarim` quote-request flow instead (see `CustomDesignPage.tsx`), since a made-to-order commission can land in any of the 5 categories |

## Notes on judgment calls

- **Multilayer** has no Etsy source category — built as an original product
  line per the brief, with its own layer-count (3/5/7/9/11) variant axis
  modeled in the schema (`Product.layerCount`, `ProductVariantOptions.layerCounts`).
- **Wall Clock** subcategories (Geometrik Desenler / Minimal Saatler / Büyük
  Boy Saatler) are a style-based split we designed, not an Etsy taxonomy —
  the shop only exposes clocks as one product type.
- Anything genuinely ambiguous (e.g. a decorative panel that's also
  wall-mounted) was placed by primary use-case (surface texture → Dekorlar,
  figurative/pictorial → Duvar Tabloları) rather than left unclassified —
  per the instruction not to stall on edge cases.
