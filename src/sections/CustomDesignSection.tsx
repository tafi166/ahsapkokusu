import { homeContent } from "@/config/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PlaceholderMedia } from "@/lib/placeholder";

const { customDesign } = homeContent;

export function CustomDesignSection() {
  return (
    <Section>
      <div className="grid items-center gap-10 md:grid-cols-2">
        <RevealOnScroll>
          <PlaceholderMedia swatch="#8a6a4b" ratio="landscape" label="Özel tasarım örneği" className="rounded-card" />
        </RevealOnScroll>
        <RevealOnScroll delay={0.1}>
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-body/60">{customDesign.eyebrow}</p>
          <h2>{customDesign.title}</h2>
          <p className="mt-4 max-w-md text-body/80">{customDesign.body}</p>
          <Button href={customDesign.ctaHref} className="mt-7">
            {customDesign.ctaLabel}
          </Button>
        </RevealOnScroll>
      </div>
    </Section>
  );
}
