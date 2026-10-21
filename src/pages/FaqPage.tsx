import { Section } from "@/components/ui/Section";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { categories } from "@/data/categories";
import { productFaq } from "@/data/faq";
import { useI18n } from "@/i18n/I18nProvider";

export function FaqPage() {
  const { t } = useI18n();
  return (
    <Section containerSize="sm">
      <h1 className="mb-2">{t.pages.faqTitle}</h1>
      <p className="mb-10 text-sm text-body/60">{t.pages.faqIntro}</p>

      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-lg">{t.pages.faqGeneral}</h2>
        {productFaq.map((item) => (
          <AccordionSection key={item.question} title={item.question}>
            <p>{item.answer}</p>
          </AccordionSection>
        ))}

        {categories.map((category) => (
          <div key={category.slug} className="mt-10">
            <h2 className="mb-4 text-lg">{category.title}</h2>
            {category.faq.map((item) => (
              <AccordionSection key={item.question} title={item.question}>
                <p>{item.answer}</p>
              </AccordionSection>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}
