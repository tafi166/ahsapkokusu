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
      <div className="mb-10 text-center">
        <h2>{copy.title}</h2>
        <p className="mt-3 text-body/70">{copy.subtitle}</p>
      </div>

      <div
        className="relative mx-auto max-w-2xl text-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.figure
            key={active.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            <StarRating rating={active.rating} className="mx-auto mb-5 justify-center" />
            <blockquote className="text-lg text-body md:text-xl">“{active.quote}”</blockquote>
            <figcaption className="mt-5 text-sm text-body/60">
              {active.authorInitial} — {active.role}
            </figcaption>
          </motion.figure>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-6">
          <button onClick={prev} aria-label={t.a11y.previousTestimonial} className="rounded-full border border-line p-2 hover:bg-white">
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
                className={`h-2 w-2 rounded-full transition-colors ${i === index ? "bg-ink" : "bg-line"}`}
              />
            ))}
          </div>
          <button onClick={next} aria-label={t.a11y.nextTestimonial} className="rounded-full border border-line p-2 hover:bg-white">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Section>
  );
}
