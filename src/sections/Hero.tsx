import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useState } from "react";
import { homeContent } from "@/config/content";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ProductMedia } from "@/lib/placeholder";
import { staggerContainer, fadeUp } from "@/lib/motion";
import { useCarousel } from "@/hooks/useCarousel";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/paths";

const { hero } = homeContent;

// One or more real photos uploaded via /admin → Ana Sayfa → Hero Görselleri;
// falls back to a single gradient placeholder slide when none are set.
// `Array.isArray` guards against a stale/malformed saved override (e.g. one
// written before this field existed) rather than crashing the whole app at
// import time — see `mergeShallowNested` in `lib/adminStore.ts` for the fix
// that keeps this from happening in the first place.
const slides = Array.isArray(hero.images) && hero.images.length > 0 ? hero.images : ["#5A341D"];

/** How far (px) a drag has to travel before it counts as a slide change. */
const DRAG_THRESHOLD = 80;
/** With several photos the hero moves on by itself, slowly enough to read the headline. */
const AUTOPLAY_MS = 7000;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Each headline line rises out of its own mask, one after another. */
const lineReveal = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: 1.1, ease: EASE } },
};

export function Hero() {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const { index, goTo, next, prev } = useCarousel({
    itemCount: slides.length,
    autoplayMs: prefersReducedMotion ? undefined : AUTOPLAY_MS,
    paused: isPaused,
  });
  const [direction, setDirection] = useState<1 | -1>(1);
  const canDrag = slides.length > 1;
  // Blank lines (a trailing newline saved from the admin panel) would become empty, invisible rows.
  const titleLines = hero.title.split("\n").filter((line) => line.trim() !== "");

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
    <section
      className="relative flex min-h-[78vh] items-center overflow-hidden bg-ink md:min-h-[86vh]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            drag={canDrag ? "x" : false}
            dragElastic={0.2}
            dragConstraints={{ left: 0, right: 0 }}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
            // Cross-fade, drifting slightly in the direction of travel.
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: `${direction * 3}%` }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: `${direction * -2}%` }}
            transition={{ duration: prefersReducedMotion ? 0.2 : 1.4, ease: EASE }}
            className={cn("absolute inset-0 h-full w-full", canDrag && "cursor-grab touch-pan-y active:cursor-grabbing")}
          >
            {/* Slow push-in on the photo while it is shown. */}
            <motion.div
              className="absolute inset-0"
              initial={prefersReducedMotion ? false : { scale: 1.12 }}
              animate={{ scale: 1 }}
              transition={{ duration: 9, ease: "easeOut" }}
            >
              <ProductMedia
                src={slides[index]}
                ratio="wide"
                label={t.a11y.heroImage}
                eager
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Left-to-right espresso gradient (not a flat tint) keeps the photo's own detail visible on the right while the text stays legible on the left; a second one grounds the bottom edge. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1A1511]/80 via-[#1A1511]/35 to-transparent" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#1A1511]/50 to-transparent" aria-hidden="true" />
      {/* On phones the text spans the whole photo, so it needs an even tint too. */}
      <div className="absolute inset-0 bg-[#1A1511]/40 md:hidden" aria-hidden="true" />

      {(!Array.isArray(hero.images) || hero.images.length === 0) ? (
        <img src="/brand/monogram.svg" alt="" aria-hidden="true" width="685" height="500"
          className="brand-hero-mark pointer-events-none absolute right-[5%] top-1/2 hidden w-[38%] max-w-[560px] -translate-y-1/2 opacity-70 lg:block" />
      ) : null}

      <Container size="lg" className="relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer(0.14)}
          className="max-w-2xl text-white"
        >
          <motion.p variants={fadeUp} className="eyebrow mb-6 text-white/80">
            {hero.eyebrow}
          </motion.p>
          <h1 className="text-white">
            {titleLines.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.08em]">
                <motion.span
                  variants={prefersReducedMotion ? fadeUp : lineReveal}
                  // The closing line is set in italic brass — the brand's signature flourish.
                  className={cn("block", i > 0 && i === titleLines.length - 1 && "italic text-[#E3C99F]")}
                >
                  {line}
                </motion.span>
                {i < titleLines.length - 1 ? " " : null}
              </span>
            ))}
          </h1>
          <motion.p variants={fadeUp} className="mt-7 max-w-md text-lg font-light leading-relaxed text-white/85">
            {hero.subtitle}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
            <Button href={localePath(hero.primaryCtaHref)} variant="secondary" size="lg">
              {hero.primaryCtaLabel}
            </Button>
            <Button href={localePath(hero.secondaryCtaHref)} variant="outline" size="lg" className="border-white/60 text-white">
              {hero.secondaryCtaLabel}
            </Button>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-8 flex items-center gap-3 text-sm tracking-wide text-white/70">
            <span className="flex gap-0.5" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={14} className="fill-brass text-brass" />
              ))}
            </span>
            {hero.trustBadge}
          </motion.p>
        </motion.div>
      </Container>

      {/* Scroll cue: a hairline with a bead travelling down it. */}
      <div aria-hidden="true" className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden h-14 w-px -translate-x-1/2 overflow-hidden bg-white/25 md:block">
        <span className="hero-scroll-cue absolute left-0 top-0 h-5 w-px bg-white" />
      </div>

      {canDrag ? (
        <>
          <button
            onClick={handlePrev}
            aria-label={t.a11y.previousImage}
            className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/25 p-3 text-white backdrop-blur-sm transition-colors duration-500 hover:bg-white hover:text-ink md:block"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNext}
            aria-label={t.a11y.nextImage}
            className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/25 p-3 text-white backdrop-blur-sm transition-colors duration-500 hover:bg-white hover:text-ink md:block"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-8 left-4 z-20 flex items-center gap-4 md:left-8" role="tablist" aria-label={t.a11y.heroSlides}>
            {slides.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={t.a11y.slide(i + 1)}
                onClick={() => handleGoTo(i)}
                className="group flex items-center gap-2 py-2 text-[11px] tracking-[0.2em] text-white/60 transition-colors hover:text-white aria-selected:text-white"
              >
                {String(i + 1).padStart(2, "0")}
                <span className="relative h-px w-10 overflow-hidden bg-white/30">
                  {/* Fills over the autoplay interval, so the next change is never a surprise. */}
                  <span
                    key={i === index ? `on-${index}` : "off"}
                    className={cn(
                      "absolute inset-0 origin-left bg-white",
                      i === index ? (prefersReducedMotion || isPaused ? "scale-x-100" : "hero-progress") : "scale-x-0",
                    )}
                  />
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
