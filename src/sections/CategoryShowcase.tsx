import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { homeContent } from "@/config/content";
import { categories } from "@/data/categories";
import { Section } from "@/components/ui/Section";
import { ProductMedia } from "@/lib/placeholder";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";
import { useI18n } from "@/i18n/I18nProvider";
import { categoryPath } from "@/i18n/paths";

const { categoryShowcase } = homeContent;

export function CategoryShowcase() {
  const { t } = useI18n();
  return (
    <Section>
      <div className="mb-10 max-w-lg">
        <h2>{categoryShowcase.title}</h2>
        <p className="mt-3 text-body/70">{categoryShowcase.subtitle}</p>
      </div>

      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer(0.1)}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {categories.map((category) => (
          <motion.li key={category.slug} variants={fadeUp}>
            <Link to={categoryPath(category)} className="group block">
              <div className="overflow-hidden rounded-card">
                <ProductMedia
                  src={category.heroImage ?? category.heroSwatch}
                  label={category.title}
                  ratio="landscape"
                  className="transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
              <div className="mt-4">
                <h3 className="text-lg">{category.title}</h3>
                <p className="mt-1 text-sm text-body/60">{category.shortDescription}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                  {t.common.explore} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
