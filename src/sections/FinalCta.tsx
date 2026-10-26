import { homeContent } from "@/config/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { localePath } from "@/i18n/paths";

const { finalCta } = homeContent;

export function FinalCta() {
  return (
    <Section scheme="tertiary" containerSize="sm" className="relative overflow-hidden">
      {/* A soft walnut glow behind the line, so the closing band isn't a flat slab. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_50%_50%,rgb(176_123_74/0.22),transparent_70%)]" />
      <RevealOnScroll className="relative text-center">
        <h2 className="text-white">{finalCta.title}</h2>
        <Button href={localePath(finalCta.ctaHref)} variant="secondary" size="lg" className="mt-9">
          {finalCta.ctaLabel}
        </Button>
      </RevealOnScroll>
    </Section>
  );
}
