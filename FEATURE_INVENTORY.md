# Feature Inventory

Phase 1 built the homepage/core layout against a reverse-engineered Shopify
reference site. **Phase 3 replaced the entire category/product domain** with
an original parametric-wood-art / CNC-design catalog (now 6 categories, a
comprehensive Product schema, wishlist/quick-view/compare) — see
`CATEGORY_MAPPING.md` for how the Etsy-shop product-type brief was mapped to
the original 5 categories (since narrowed to 6 shippable ones — see `README.md`), and `README.md`'s "Known limitations" for what's still
mock/demo-scale.

Status legend: **Built** = implemented and working against mock data/services
· **Scaffolded** = route/UI exists, real content pending · **Not built** =
explicitly out of scope for now.

| Feature | Status | Behavior | Implementation |
|---|---|---|---|
| 5-category taxonomy | Built | SEO-slug routes, subcategories, per-category facet config, all generated from one data source | `data/categories.ts` |
| Category pages | Built | Hero banner, breadcrumb, real filter (availability/price/material/color/subcategory/layer count) + sort (6 options) + "Load More" pagination, category FAQ, related categories | `CategoryPage.tsx`, `FilterSortBar.tsx`, `FilterDrawer.tsx` |
| Product detail pages | Built | Gallery, rating, "₺X" / "Sipariş üzerine" / "Tükendi" pricing, conditional fields by product type (dimensions/material/layer count/file type), variant selectors (size/width/color/finish/frame/layer/height), accordion details, share-link copy, related products | `ProductPage.tsx`, `Gallery.tsx`, `VariantSelectors.tsx` |
| Digital + physical delivery | Built | `deliveryType: DIGITAL/PHYSICAL/BOTH` drives UI branching (file formats & software compatibility vs. quantity/shipping copy) | `types/index.ts` `Product.deliveryType`, `wallArt.ts` (has DIGITAL and BOTH examples) |
| Wishlist | Built | Heart toggle on every product card + product page, persisted to localStorage, dedicated `/favoriler` page | `hooks/useWishlist.tsx`, `WishlistPage.tsx` |
| Quick View | Built | Centered animated modal from any product card, add-to-cart without leaving the grid | `hooks/useQuickView.tsx`, `QuickViewModal.tsx` |
| Product comparison | Built (small furniture only) | Add up to 4 small-furniture items via a product-page button, compare price/material/dimensions/finish/assembly in a table at `/karsilastir` | `hooks/useCompare.tsx`, `ComparePage.tsx` |
| Global search | Built | Full-screen overlay, debounced, matches title/category/subcategory/tags/description, shows thumbnail+category+price per result | `SearchOverlay.tsx`, `lib/api.ts` |
| Cart | Built | Add/remove/adjust qty, subtotal, persists to localStorage, slide-in drawer | `hooks/useCart.tsx`, `CartDrawer.tsx` |
| Checkout / payment | **Not built** | N/A | Needs a real backend — the cart drawer says so explicitly instead of faking it |
| Custom design requests | Built | Dedicated form (name/email/category/brief) via the mock contact API, absorbs Etsy's "Custom Works" type instead of forcing it into one category | `CustomDesignPage.tsx` |
| Homepage | Built | Hero, category showcase, featured/best-seller/new-arrival product grids, parametric-design story, material/craft section, custom-design CTA, partner logos, trust signals, testimonials, blog preview, final CTA, newsletter | `HomePage.tsx` + `sections/*` |
| SEO | Built (client-side) | `document.title` + meta description + JSON-LD (`Product`, `BreadcrumbList`) injected per page via a hook; category/product SEO copy lives in `data/categories.ts` / per-product `seoTitle`/`seoDescription` | `lib/seo.ts` |
| Account / login | Scaffolded | `/hesabim` states plainly that auth isn't wired to a backend; cart/wishlist work regardless since they don't need an account | `AccountPage.tsx` |
| Admin content panel | Built (browser-local) | `/admin` — password-gated (not real auth), edits brand/contact, every homepage section's copy, category text/FAQ, full product CRUD (+ raw-JSON escape hatch for less common fields), testimonials/trust signals/partner logos/blog/product FAQ. Product photos and homepage hero photos upload from disk (resized/never stretched), shared `ImageGalleryField` picker. Persists to localStorage via a full-replace override store every data module checks at load time; export/import JSON to move edits between browsers | `pages/admin/*`, `lib/adminStore.ts`, `lib/imageResize.ts` |
| Hero slideshow | Built | 2+ uploaded hero photos turn the static hero into a slideshow: drag/swipe (mouse or touch) left/right, arrow buttons, numbered dot nav; 0–1 photos render as a plain static hero (unchanged) | `sections/Hero.tsx`, `hooks/useCarousel.ts` |
| Reduced-motion support | Built | Global CSS override + Framer Motion `useReducedMotion` checks | `styles/globals.css`, `Testimonials.tsx`, `PartnerLogos.tsx` |
| Mobile menu, mega-menu, sticky header, scroll-to-top | Built (carried over from Phase 1) | Unchanged in mechanism, content now sourced from `data/categories.ts` | `Header.tsx`, `MegaMenu.tsx`, `MobileMenu.tsx` |
