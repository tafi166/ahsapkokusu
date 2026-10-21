import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { homeContent } from "@/config/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ProductMedia } from "@/lib/placeholder";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useCarousel } from "@/hooks/useCarousel";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";

const { hero } = homeContent;

// One or more real photos uploaded via /admin → Ana Sayfa → Hero Görselleri;
// falls back to a single gradient placeholder slide when none are set.
// `Array.isArray` guards against a stale/malformed saved override (e.g. one
// written before this field existed) rather than crashing the whole app at
// import time — see `mergeShallowNested` in `lib/adminStore.ts` for the fix
// that keeps this from happening in the first place.
const slides = Array.isArray(hero.images) && hero.images.length > 0 ? hero.images : ["#2b2b2b"];

/** How far (px) a drag has to travel before it counts as a slide change. */
const DRAG_THRESHOLD = 80;

export function Hero() {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const { index, goTo, next, prev } = useCarousel({ itemCount: slides.length });
  const [direction, setDirection] = useState<1 | -1>(1);
  const canDrag = slides.length > 1;

  function handleNext() {
    setDirection(1);
    next();
  }
  function handlePrev() {
    setDirection(-1);
    prev();
  }
  function handleGoTo(i: number) {
    setDirection(i > index ? 1 : -1);
    goTo(i);
  }
  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.x <= -DRAG_THRESHOLD) handleNext();
    else if (info.offset.x >= DRAG_THRESHOLD) handlePrev();
  }

  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden md:min-h-[88vh]">
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            drag={canDrag ? "x" : false}
            dragElastic={0.2}
            dragConstraints={{ left: 0, right: 0 }}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            initial={prefersReducedMotion ? { opacity: 0 } : { x: direction === 1 ? "100%" : "-100%" }}
            animate={{ x: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: direction === 1 ? "-100%" : "100%" }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 0.5, ease: [0.455, 0.03, 0.515, 0.955] }}
            className={cn("absolute inset-0 h-full w-full", canDrag && "cursor-grab touch-pan-y active:cursor-grabbing")}
          >
            <ProductMedia
              src={slides[index]}
              ratio="wide"
              label={t.a11y.heroImage}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Left-to-right gradient (not a flat tint) keeps the photo's own detail visible on the right while the text stays legible on the left. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" aria-hidden="true" />

      <Container size="lg" className="relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.15)}
          className="max-w-xl text-white"
        >
          <motion.p variants={fadeUp} className="mb-4 text-sm uppercase tracking-[0.2em] text-white/80">
            {hero.eyebrow}
          </motion.p>
          <motion.h1 variants={fadeUp} className="whitespace-pre-line text-white">
            {hero.title}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-5 max-w-md text-base text-white/85">
            {hero.subtitle}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-4">
            <Button href={hero.primaryCtaHref} variant="secondary" size="lg">
              {hero.primaryCtaLabel}
            </Button>
            <Button href={hero.secondaryCtaHref} variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
              {hero.secondaryCtaLabel}
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-6 text-sm text-white/70">
            {hero.trustBadge} ⭐⭐⭐⭐⭐
          </motion.p>
        </motion.div>
      </Container>

      {canDrag ? (
        <>
          <button
            onClick={handlePrev}
            aria-label={t.a11y.previousImage}
            className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/25 md:block"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            aria-label={t.a11y.nextImage}
            className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/25 md:block"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute right-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3" role="tablist" aria-label={t.a11y.heroSlides}>
            {slides.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={t.a11y.slide(i + 1)}
                onClick={() => handleGoTo(i)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors",
                  i === index ? "border-white bg-white text-ink" : "border-white/50 text-white/70 hover:border-white",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
