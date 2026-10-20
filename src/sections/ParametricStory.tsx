import { homeContent } from "@/config/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PlaceholderMedia } from "@/lib/placeholder";

const { parametricStory } = homeContent;

export function ParametricStory() {
  return (
    <Section scheme="secondary">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <RevealOnScroll>
          <PlaceholderMedia swatch="#3c3c3c" ratio="landscape" label="Parametrik tasarım süreci" className="rounded-card" />
        </RevealOnScroll>
        <RevealOnScroll delay={0.1}>
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-body/60">{parametricStory.eyebrow}</p>
          <h2>{parametricStory.title}</h2>
          <p className="mt-4 max-w-md text-body/80">{parametricStory.body}</p>
          <Button href={parametricStory.ctaHref} className="mt-7">
            {parametricStory.ctaLabel}
          </Button>
        </RevealOnScroll>
      </div>
    </Section>
  );
}
