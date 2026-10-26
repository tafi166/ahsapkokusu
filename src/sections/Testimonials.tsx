import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { homeContent } from "@/config/content";
import { testimonials } from "@/data/testimonials";
import { Section } from "@/components/ui/Section";
import { StarRating } from "@/components/ui/StarRating";
import { useCarousel } from "@/hooks/useCarousel";
import { useI18n } from "@/i18n/I18nProvider";

const { testimonials: copy } = homeContent;

export function Testimonials() {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const { index, goTo, next, prev } = useCarousel({
    itemCount: testimonials.length,
    autoplayMs: prefersReducedMotion ? undefined : 6000,
    paused: isPaused,
  });
  const active = testimonials[index];

  return (
    <Section scheme="secondary">
      <div className="mb-12 text-center">
        <h2>{copy.title}</h2>
        <p className="mt-4 text-body/70">{copy.subtitle}</p>
      </div>

      <div
        className="relative mx-auto max-w-2xl text-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.figure
            key={active.id}
            initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <StarRating rating={active.rating} className="mx-auto mb-5 justify-center" />
            <blockquote className="font-heading text-2xl italic leading-snug text-ink md:text-[2rem]">“{active.quote}”</blockquote>
            <figcaption className="mt-6 text-xs uppercase tracking-[0.2em] text-body/60">
              {active.authorInitial} — {active.role}
            </figcaption>
          </motion.figure>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-6">
          <button onClick={prev} aria-label={t.a11y.previousTestimonial} className="rounded-full border border-line p-3 transition-colors duration-500 hover:border-ink hover:bg-ink hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-2" role="tablist" aria-label={t.a11y.testimonialSlides}>
            {testimonials.map((item, i) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={i === index}
                aria-label={t.a11y.showTestimonial(i + 1)}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? "w-6 bg-ink" : "w-1.5 bg-divider/50"}`}
              />
            ))}
          </div>
          <button onClick={next} aria-label={t.a11y.nextTestimonial} className="rounded-full border border-line p-3 transition-colors duration-500 hover:border-ink hover:bg-ink hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Section>
  );
}
