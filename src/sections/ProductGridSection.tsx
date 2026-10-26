import { motion } from "framer-motion";
import { Section } from "@/components/ui/Section";
import { SectionHead } from "@/components/ui/SectionHead";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/ui/ProductCard";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";
import type { Product } from "@/types";
import { localePath } from "@/i18n/paths";

/**
 * Reusable "N products in a grid" homepage section — backs Featured
 * Products, Best Sellers and New Arrivals so each one isn't a near-copy
 * of the others.
 */
export function ProductGridSection({
  title,
  subtitle,
  products,
  ctaLabel,
  ctaHref,
  scheme = "primary",
}: {
  title: string;
  subtitle: string;
  products: Product[];
  ctaLabel?: string;
  ctaHref?: string;
  scheme?: "primary" | "secondary";
}) {
  if (products.length === 0) return null;

  return (
    <Section scheme={scheme}>
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <SectionHead title={title} subtitle={subtitle} />
        {ctaLabel && ctaHref ? (
          <Button href={localePath(ctaHref)} variant="outline">
            {ctaLabel}
          </Button>
        ) : null}
      </div>

      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer(0.1)}
        className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14"
      >
        {products.slice(0, 8).map((product) => (
          <motion.li key={product.id} variants={fadeUp}>
            <ProductCard product={product} />
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
