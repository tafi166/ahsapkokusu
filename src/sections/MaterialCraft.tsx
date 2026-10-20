import { homeContent } from "@/config/content";
import { Section } from "@/components/ui/Section";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PlaceholderMedia } from "@/lib/placeholder";

const { materialCraft } = homeContent;

export function MaterialCraft() {
  return (
    <Section scheme="tertiary">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <RevealOnScroll>
          <p className="mb-3 text-sm uppercase tracking-[0.2em] text-white/60">{materialCraft.eyebrow}</p>
          <h2 className="text-white">{materialCraft.title}</h2>
          <p className="mt-4 max-w-md text-white/75">{materialCraft.body}</p>
        </RevealOnScroll>
        <RevealOnScroll delay={0.1} className="order-first md:order-last">
          <PlaceholderMedia swatch="#5c4632" ratio="landscape" label="Ahşap malzeme ve CNC işçiliği" className="rounded-card" />
        </RevealOnScroll>
      </div>
    </Section>
  );
}
