import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { homeContent } from "@/config/content";
import { blogPosts } from "@/data/blog";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { PlaceholderMedia } from "@/lib/placeholder";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";
import { localePath } from "@/i18n/paths";

const { blog: copy } = homeContent;

export function BlogPreview() {
  return (
    <Section>
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-lg">
          <h2>{copy.title}</h2>
          <p className="mt-4 text-body/70">{copy.subtitle}</p>
        </div>
        <Button href={localePath(copy.ctaHref)} variant="outline">
          {copy.ctaLabel}
        </Button>
      </div>

      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerContainer(0.1)}
        className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
      >
        {blogPosts.map((post) => (
          <motion.li key={post.id} variants={fadeUp}>
            <Link to={localePath("/blog")} className="group block">
              <div className="overflow-hidden rounded-card">
                <PlaceholderMedia
                  swatch={post.swatch}
                  ratio="landscape"
                  className="transition-transform duration-[1400ms] ease-[var(--ease-premium)] group-hover:scale-[1.06]"
                />
              </div>
              <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-body/50">
                {new Date(post.date).toLocaleDateString("tr-TR", { month: "long", day: "numeric", year: "numeric" })}
                {" · "}
                {post.readMinutes} dk okuma
              </p>
              <h3 className="mt-2 text-2xl leading-tight">
                <span className="link-draw">{post.title}</span>
              </h3>
              <p className="mt-2 text-sm text-body/70">{post.excerpt}</p>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
