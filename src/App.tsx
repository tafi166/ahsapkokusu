import { lazy, Suspense, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
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
  return (
    <Suspense
      fallback={
        <div role="status" className="flex min-h-[40vh] items-center justify-center text-sm text-body/50">
          Yükleniyor…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Content admin panel — deliberately outside <Layout>: no storefront
          header/footer/cart here, this is a tool, not a marketing page.
          See src/pages/admin/AdminPage.tsx. */}
      <Route path="admin" element={<Loading><AdminPage /></Loading>} />

      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        {/* Product & category catalog — SEO-friendly Turkish slugs */}
        <Route path="urun/:slug" element={<ProductPage />} />
        <Route path="favoriler" element={<WishlistPage />} />
        <Route path="karsilastir" element={<ComparePage />} />

        {/* Standalone pages */}
        <Route path="ozel-tasarim" element={<Loading><CustomDesignPage /></Loading>} />
        <Route path="iletisim" element={<ContactPage />} />
        <Route path="blog" element={<BlogIndexPage />} />
        <Route path="yorumlar" element={<ReviewsPage />} />
        <Route path="sss" element={<FaqPage />} />
        <Route path="hesabim" element={<AccountPage />} />
        <Route path="odeme" element={<Loading><CheckoutPage /></Loading>} />
        <Route path="sayfa/:slug" element={<InfoPage />} />

        {/* Category pages last — :categorySlug is a catch-all-ish dynamic
            segment, but React Router ranks the static routes above it
            higher regardless of declaration order, so it never shadows them. */}
        <Route path=":categorySlug" element={<CategoryPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
