import { Section } from "@/components/ui/Section";
import { AccordionSection } from "@/components/ui/AccordionSection";
import { categories } from "@/data/categories";
import { productFaq } from "@/data/faq";

export function FaqPage() {
  return (
    <Section containerSize="sm">
      <h1 className="mb-2">Sıkça Sorulan Sorular</h1>
      <p className="mb-10 text-sm text-body/60">Genel sorular ve kategoriye özel detaylar.</p>

      <div className="mx-auto max-w-2xl">
        <h2 className="mb-4 text-lg">Genel</h2>
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
