import { homeContent } from "@/config/content";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { localePath } from "@/i18n/paths";

const { finalCta } = homeContent;

export function FinalCta() {
  return (
    <Section scheme="tertiary" containerSize="sm">
      <RevealOnScroll className="text-center">
        <h2 className="text-white">{finalCta.title}</h2>
        <Button href={localePath(finalCta.ctaHref)} variant="secondary" size="lg" className="mt-7">
          {finalCta.ctaLabel}
        </Button>
      </RevealOnScroll>
    </Section>
  );
}
