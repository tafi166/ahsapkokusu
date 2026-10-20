import { homeContent } from "@/config/content";
import { Section } from "@/components/ui/Section";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { NewsletterForm } from "@/components/ui/NewsletterForm";

const { newsletter } = homeContent;

export function Newsletter() {
  return (
    <Section scheme="tertiary" containerSize="sm">
      <RevealOnScroll className="text-center">
        <h2 className="text-white">{newsletter.title}</h2>
        <p className="mx-auto mt-3 max-w-md text-white/70">{newsletter.subtitle}</p>
        <NewsletterForm
          placeholder={newsletter.placeholder}
          ctaLabel={newsletter.ctaLabel}
          buttonVariant="secondary"
          className="mx-auto mt-7 max-w-md"
        />
      </RevealOnScroll>
    </Section>
  );
}
