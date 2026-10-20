import { Hero } from "@/sections/Hero";
import { CategoryShowcase } from "@/sections/CategoryShowcase";
import { ProductGridSection } from "@/sections/ProductGridSection";
import { ParametricStory } from "@/sections/ParametricStory";
import { MaterialCraft } from "@/sections/MaterialCraft";
import { CustomDesignSection } from "@/sections/CustomDesignSection";
import { PartnerLogos } from "@/sections/PartnerLogos";
import { TrustSignals } from "@/sections/TrustSignals";
import { Testimonials } from "@/sections/Testimonials";
import { BlogPreview } from "@/sections/BlogPreview";
import { FinalCta } from "@/sections/FinalCta";
import { Newsletter } from "@/sections/Newsletter";
import { homeContent } from "@/config/content";
import { featuredProducts, bestSellerProducts, newArrivalProducts } from "@/data/products";

export function HomePage() {
  return (
    <>
      <Hero />
      <CategoryShowcase />
      <ProductGridSection
        scheme="secondary"
        title={homeContent.featuredProducts.title}
        subtitle={homeContent.featuredProducts.subtitle}
        products={featuredProducts}
        ctaLabel={homeContent.featuredProducts.ctaLabel}
        ctaHref={homeContent.featuredProducts.ctaHref}
      />
      <ProductGridSection
        title={homeContent.bestSellers.title}
        subtitle={homeContent.bestSellers.subtitle}
        products={bestSellerProducts}
      />
      <ParametricStory />
      <ProductGridSection
        scheme="secondary"
        title={homeContent.newArrivals.title}
        subtitle={homeContent.newArrivals.subtitle}
        products={newArrivalProducts}
      />
      <MaterialCraft />
      <CustomDesignSection />
      <PartnerLogos />
      <TrustSignals />
      <Testimonials />
      <BlogPreview />
      <FinalCta />
      <Newsletter />
    </>
  );
}
