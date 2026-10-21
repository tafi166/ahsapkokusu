import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import { useI18n } from "@/i18n/I18nProvider";
import { contentLocale } from "@/i18n/locale";
import { pageSegment } from "@/i18n/paths";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { CategoryPage } from "@/pages/CategoryPage";
import { ProductPage } from "@/pages/ProductPage";
import { WishlistPage } from "@/pages/WishlistPage";
import { ComparePage } from "@/pages/ComparePage";
import { ContactPage } from "@/pages/ContactPage";
import { BlogIndexPage } from "@/pages/BlogIndexPage";
import { ReviewsPage } from "@/pages/ReviewsPage";
import { FaqPage } from "@/pages/FaqPage";
import { InfoPage } from "@/pages/InfoPage";
import { AccountPage } from "@/pages/AccountPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

// Split out of the main bundle: the admin panel is staff-only, and checkout and the
// custom-design forms are visited far less than the catalog pages.
const AdminPage = lazy(() => import("@/pages/admin/AdminPage").then((m) => ({ default: m.AdminPage })));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const CustomDesignPage = lazy(() => import("@/pages/CustomDesignPage").then((m) => ({ default: m.CustomDesignPage })));

function Loading({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div role="status" className="flex min-h-[40vh] items-center justify-center text-sm text-body/50">
          {t.common.loading}
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  const locale = contentLocale();
  const seg = (tr: string) => pageSegment(tr, locale);
  return (
    <Routes>
      {/* Content admin panel — deliberately outside <Layout>: no storefront
          header/footer/cart here, this is a tool, not a marketing page.
          Turkish addresses only: it edits the Turkish source content, so it
          must never load the English-localized data. See src/pages/admin/AdminPage.tsx. */}
      {locale === "tr" ? <Route path="admin" element={<Loading><AdminPage /></Loading>} /> : null}

      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        {/* Product & category catalog — SEO-friendly slugs in the page's language (i18n/paths.ts) */}
        <Route path={`${seg("urun")}/:slug`} element={<ProductPage />} />
        <Route path={seg("favoriler")} element={<WishlistPage />} />
        <Route path={seg("karsilastir")} element={<ComparePage />} />

        {/* Standalone pages */}
        <Route path={seg("ozel-tasarim")} element={<Loading><CustomDesignPage /></Loading>} />
        <Route path={seg("iletisim")} element={<ContactPage />} />
        <Route path={seg("blog")} element={<BlogIndexPage />} />
        <Route path={seg("yorumlar")} element={<ReviewsPage />} />
        <Route path={seg("sss")} element={<FaqPage />} />
        <Route path={seg("hesabim")} element={<AccountPage />} />
        <Route path={seg("odeme")} element={<Loading><CheckoutPage /></Loading>} />
        <Route path={`${seg("sayfa")}/:slug`} element={<InfoPage />} />

        {/* Category pages last — :categorySlug is a catch-all-ish dynamic
            segment, but React Router ranks the static routes above it
            higher regardless of declaration order, so it never shadows them. */}
        <Route path=":categorySlug" element={<CategoryPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
