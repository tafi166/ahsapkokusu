import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { homeContent } from "@/config/content";
import { blogPosts } from "@/data/blog";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { PlaceholderMedia } from "@/lib/placeholder";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";

const { blog: copy } = homeContent;

export function BlogPreview() {
  return (
    <Section>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-lg">
          <h2>{copy.title}</h2>
          <p className="mt-3 text-body/70">{copy.subtitle}</p>
        </div>
        <Button href={copy.ctaHref} variant="outline">
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
            <Link to="/blog" className="group block">
              <PlaceholderMedia
                swatch={post.swatch}
                ratio="landscape"
                className="rounded-card transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <p className="mt-4 text-xs uppercase tracking-wide text-body/50">
                {new Date(post.date).toLocaleDateString("tr-TR", { month: "long", day: "numeric", year: "numeric" })}
                {" · "}
                {post.readMinutes} dk okuma
              </p>
              <h3 className="mt-1 text-base font-body font-medium">{post.title}</h3>
              <p className="mt-2 text-sm text-body/70">{post.excerpt}</p>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </Section>
  );
}
