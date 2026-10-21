import { Section } from "@/components/ui/Section";
import { PlaceholderMedia } from "@/lib/placeholder";
import { blogPosts } from "@/data/blog";
import { useI18n } from "@/i18n/I18nProvider";
import { INTL_LOCALE } from "@/i18n/money";

export function BlogIndexPage() {
  const { t, locale } = useI18n();
  return (
    <Section>
      <h1 className="mb-10">{t.pages.blogTitle}</h1>
      <ul className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post) => (
          <li key={post.id}>
            <PlaceholderMedia swatch={post.swatch} ratio="landscape" className="rounded-card" />
            <p className="mt-4 text-xs uppercase tracking-wide text-body/50">
              {new Date(post.date).toLocaleDateString(INTL_LOCALE[locale], { month: "long", day: "numeric", year: "numeric" })}
              {" · "}
              {t.pages.readMinutes(post.readMinutes)}
            </p>
            <h2 className="mt-1 text-lg">{post.title}</h2>
            <p className="mt-2 text-sm text-body/70">{post.excerpt}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
