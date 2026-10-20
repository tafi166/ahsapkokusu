# Parametrika — parametric wood art / CNC design e-commerce platform

Started as a reference-site homepage clone (Phase 1–2), then **pivoted its
entire category and product architecture (Phase 3)** into an original
parametric-wood-art / CNC-design storefront, using
`etsy.com/shop/ParametricArtWood`'s product-type vocabulary as a structural
reference (not a scraped catalog — that shop blocks automated access
entirely, see `CATEGORY_MAPPING.md`). React 19 + TypeScript + Vite +
Tailwind CSS v4 + React Router 7 + Framer Motion, data-driven throughout so
the catalog scales to hundreds of real products without touching component
code.

## The 5 categories

`/parametrik-duvar-tablolari` · `/katmanli-multilayer-tablolar` ·
`/parametrik-mobilyalar` · `/duvar-saatleri` · `/dekorlar` — defined once in
`src/data/categories.ts` (title, description, subcategories, which filters
apply, SEO copy, FAQ) and consumed everywhere: header mega-menu, footer,
homepage showcase, category pages. See `CATEGORY_MAPPING.md` for how Etsy's
product types map onto these 5.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router 7 · Framer
Motion · lucide-react (icons) · Vitest + Testing Library (smoke tests).

## Admin panel (`/admin`)

A non-technical content editor lives at `/admin` — brand/contact info, every
homepage section's copy, category text/FAQ, full product CRUD (add/edit/
delete, with a "JSON olarak düzenle" escape hatch for the less common
schema fields like variants or file types), and testimonials/trust
signals/partner logos/blog posts/product FAQ.

Product photos, and the homepage hero images (Ana Sayfa İçerikleri → Hero
Görselleri), can be uploaded straight from disk instead of using a swatch
placeholder — both use the same `ImageGalleryField` gallery picker
(`pages/admin/controls.tsx`). Each upload is redrawn through a canvas
(`lib/imageResize.ts`) at its original aspect ratio — only downscaled if
it exceeds ~1600px (2400px for hero photos) on its longest side, never
upscaled or stretched on either axis — then rendered with `object-fit:
cover` inside the same fixed-ratio boxes the rest of the site already
uses (`ProductMedia` in `lib/placeholder.tsx`), so a photo is cropped to
fit when needed but is never distorted.

Uploading more than one hero photo turns the homepage hero into a
slideshow (`sections/Hero.tsx`): drag/swipe it left or right with the
mouse (or a touchscreen — both are the same pointer gesture to a browser)
to move between slides, or use the arrow buttons / numbered dots. One
photo (or none) renders exactly as before — a plain static hero.

Because photos are stored as data URIs in the same localStorage override
(see below), a product — or the hero — with many large photos can hit
the browser's storage quota — the panel surfaces
that as an error on save rather than silently dropping the images.

**How it actually persists content, given there's no backend:** every data
module (`config/brand.ts`, `config/content.ts`, `data/categories.ts`,
`data/products/index.ts`, `data/testimonials.ts`, `data/trustSignals.ts`,
`data/blog.ts`, `data/faq.ts`) checks `lib/adminStore.ts`'s localStorage-
backed override store once at module-load time and uses a saved override
in place of its hand-written default when one exists. The admin panel
always edits a live copy of the *already-merged* data, and a "Kaydet"
always writes the whole object/array back — see the doc comment at the top
of `lib/adminStore.ts` for why that's simpler and safer than a partial/deep
merge. Because overrides are read once per page load rather than
reactively, saving shows a "sayfayı yenileyin" prompt instead of updating
the live site instantly.

This means: edits are **per-browser** (localStorage), not synced to other
visitors or devices, and won't survive the user clearing site data — the
"Yedekle & Sıfırla" tab's export/import JSON is the way to move edits
between browsers or hand them to a developer to bake into the next real
deploy. The `/admin` password gate (`src/pages/admin/adminAuth.ts`) is
explicitly **not real authentication** — it's a plaintext client-side
password meant only to stop accidental clicks, documented as such in the
panel itself. Don't put this route on a public domain without a real auth
layer in front of it.

## Rebrand / customize this project

| File | Controls |
|---|---|
| `src/config/brand.ts` | Name, tagline, contact info, social links |
| `src/config/theme.ts` + `src/styles/globals.css` `@theme` block | Colors, fonts, radii, breakpoints |
| `src/config/navigation.ts` | Generated from `data/categories.ts` — usually you edit categories instead |
| `src/config/content.ts` | All homepage section copy |
| `src/data/categories.ts` | The 5 categories: titles, descriptions, subcategories, filters, SEO, FAQ |
| `src/data/products/*.ts` | The product catalog, one file per category + `index.ts` aggregator |
| `src/lib/api.ts` | Swap mock async functions (search, contact, newsletter) for real API calls |
| `src/lib/placeholder.tsx` | Swap the gradient placeholder for real `<img>`/`<picture>` once you have licensed photography |
| `public/` + `Product.images`/`thumbnail` | Point these at real asset paths, e.g. `/assets/products/parametrik-duvar-tablolari/urun-001.webp` |

### Adding a product

Add one object to the matching file in `src/data/products/` (`wallArt.ts`,
`multilayer.ts`, `furniture.ts`, `clocks.ts`, `decor.ts`) following the
`Product` type in `src/types/index.ts` — no component changes needed. Every
page (category grid, search, featured/best-seller/new-arrival homepage
sections, related products) reads from the same `allProducts` array in
`src/data/products/index.ts`.

## Product schema

`src/types/index.ts` defines the full schema (id/slug/title/category/
pricing/images/material/dimensions/variants/productType/deliveryType/
fileTypes/difficulty/assembly/stock/availability/featured flags/rating/tags/
SEO/timestamps) — see the file for field-level docs. Not every field applies
to every product type; conditional rendering (e.g. dimensions for furniture,
file formats for digital wall art) lives in `ProductPage.tsx`.

## Known limitations (read before assuming parity)

- **Etsy's shop could not be accessed at all** — every request (WebFetch and
  direct `curl`) hit a DataDome/CAPTCHA wall. The category mapping and
  product-type vocabulary come from the task brief itself (which was
  written from browsing that shop) and general domain knowledge, not a
  live scrape — see `CATEGORY_MAPPING.md`.
- **The catalog is a ~28-item hand-written seed**, not an import of the
  Etsy shop's 200+ listings. The architecture (data-driven cards, category
  filtering/sorting, pagination) scales to hundreds of items without code
  changes — growing the catalog is a data-entry task, not an engineering
  one. No real product photography, real customer reviews, or the
  reference shop's actual brand/listing text were copied — all names,
  copy and placeholder gradient images here are original.
- **No real backend.** Cart, wishlist, compare, search, quick view,
  contact/custom-design forms and newsletter are fully interactive against
  local state and a mock service layer (`lib/api.ts`) — nothing is
  persisted server-side, there's no real checkout/payment/digital-file
  delivery, and account/login is a labeled placeholder. The `/admin`
  content panel is subject to the same constraint — see "Admin panel"
  above — its edits live in that browser's localStorage, not a database.
- **SEO is client-side only** (`document.title`/meta/JSON-LD set via a
  hook after mount) since this is a Vite SPA with no server-rendering
  framework. Google's renderer executes JS before indexing, so this is a
  real improvement over nothing, but a true SSR migration (Next.js/Remix)
  would be needed for meta tags to be present in the raw HTML response.
- **No visual/browser QA tooling was available** while building this —
  verification is TypeScript + production build + an automated
  render/interaction test suite (Vitest + Testing Library covering every
  route, filter/sort/pagination, wishlist, quick view, variant-gated
  add-to-cart), not a pixel-level visual diff against a design mock.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
npm run test       # vitest run — routing/render/interaction smoke tests
npm run lint       # oxlint
```

## API server (`server/`) — in progress

A NestJS + Prisma + PostgreSQL REST API lives in `server/` with its own
`package.json`. The storefront does **not** use it yet; it still reads the
catalog from `src/data`. So far the server serves the catalog read-only
(`GET /api/health`, `/api/categories[/:slug]`, `/api/products[/:slug]`,
filters `category`, `featured`, `bestSeller`, `newProduct`) and handles
admin sign-in and user management.

```bash
cd server
cp .env.example .env   # then set a local password in all three places
npm install
npm run db:local       # PostgreSQL on :5433 via embedded-postgres (no Docker); keep running
npm run db:migrate     # apply migrations to the dev database
npm run db:test:migrate
npm run db:seed        # insert the demo catalog (isSample = true); never overwrites existing rows
npm run admin:create   # first ADMIN user; the password is asked at a hidden prompt
npm run dev            # http://localhost:3000/api
npm run typecheck && npm test
```

Admin sign-in (`/api/auth/login`, `/logout`, `/me`, `/password`) uses a
server-side session: a random token in an HttpOnly, SameSite=Strict cookie
(`__Host-`/Secure in production), stored only as a SHA-256 hash, with a 2-hour
idle and 12-hour absolute limit. State-changing requests need an allowed
`Origin` and the session's `X-CSRF-Token`. Passwords are argon2id hashes.
Roles: `ADMIN` (also manages users via `/api/users`) and `EDITOR`.

Editable content: `GET /api/site` returns the catalog plus every edited block
in one request. Editors write through `/api/admin/content/:key`,
`/api/admin/products` (full list), `/api/admin/categories` and
`/api/admin/media` (raw JPEG/PNG/WebP, checked by its first bytes, stored under
`UPLOAD_DIR` with a random name, served from `/api/media/:file`). Links must be
site paths or https URLs and images must be uploaded files or colour swatches,
so stored content can't carry script. After changing a field in
`src/config/brandDefaults.ts` or `contentDefaults.ts`, run
`npm run content:shapes` (a test fails until you do).

The seed reads the same `src/data` files the storefront uses, and the
integration tests check that every product and category comes back from the
API unchanged.
