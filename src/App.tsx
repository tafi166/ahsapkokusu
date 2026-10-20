import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { CategoryPage } from "@/pages/CategoryPage";
import { ProductPage } from "@/pages/ProductPage";
import { WishlistPage } from "@/pages/WishlistPage";
import { ComparePage } from "@/pages/ComparePage";
import { CustomDesignPage } from "@/pages/CustomDesignPage";
import { ContactPage } from "@/pages/ContactPage";
import { BlogIndexPage } from "@/pages/BlogIndexPage";
import { ReviewsPage } from "@/pages/ReviewsPage";
import { FaqPage } from "@/pages/FaqPage";
import { InfoPage } from "@/pages/InfoPage";
import { AccountPage } from "@/pages/AccountPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AdminPage } from "@/pages/admin/AdminPage";

export default function App() {
  return (
    <Routes>
      {/* Content admin panel — deliberately outside <Layout>: no storefront
          header/footer/cart here, this is a tool, not a marketing page.
          See src/pages/admin/AdminPage.tsx. */}
      <Route path="admin" element={<AdminPage />} />

      <Route element={<Layout />}>
        <Route index element={<HomePage />} />

        {/* Product & category catalog — SEO-friendly Turkish slugs */}
        <Route path="urun/:slug" element={<ProductPage />} />
        <Route path="favoriler" element={<WishlistPage />} />
        <Route path="karsilastir" element={<ComparePage />} />

        {/* Standalone pages */}
        <Route path="ozel-tasarim" element={<CustomDesignPage />} />
        <Route path="iletisim" element={<ContactPage />} />
        <Route path="blog" element={<BlogIndexPage />} />
        <Route path="yorumlar" element={<ReviewsPage />} />
        <Route path="sss" element={<FaqPage />} />
        <Route path="hesabim" element={<AccountPage />} />
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
