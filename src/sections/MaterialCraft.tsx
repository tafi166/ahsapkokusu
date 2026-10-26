import { homeContent } from "@/config/content";
import { Section } from "@/components/ui/Section";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PlaceholderMedia } from "@/lib/placeholder";
import { useI18n } from "@/i18n/I18nProvider";

const { materialCraft } = homeContent;

export function MaterialCraft() {
  const { t } = useI18n();
  return (
    <Section scheme="tertiary">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <RevealOnScroll>
          <p className="eyebrow mb-5 text-white/60">{materialCraft.eyebrow}</p>
          <h2 className="text-white">{materialCraft.title}</h2>
          <p className="mt-6 max-w-md text-white/75">{materialCraft.body}</p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.1} className="order-first md:order-last">
          <PlaceholderMedia swatch="#5c4632" ratio="landscape" label={t.a11y.materialImage} className="rounded-card" />
        </RevealOnScroll>
      </div>
    </Section>
  );
}
