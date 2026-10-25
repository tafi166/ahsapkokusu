import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { ProductMedia, isRealImageSrc } from "@/lib/placeholder";
import { cn } from "@/lib/cn";

/** Slow-out curve for the incoming photo, quicker ease for the outgoing one. */
const EASE_IN: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];
/** A swipe counts once it travels this far or flicks this fast. */
const SWIPE_DISTANCE = 50;
const SWIPE_VELOCITY = 400;

const slide = {
  enter: ({ dir, reduce }: { dir: number; reduce: boolean }) =>
    reduce ? { opacity: 0 } : { opacity: 0, x: `${dir * 8}%`, scale: 1.06, filter: "blur(6px)" },
  center: { opacity: 1, x: "0%", scale: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE_IN } },
  exit: ({ dir, reduce }: { dir: number; reduce: boolean }) =>
    reduce
      ? { opacity: 0, transition: { duration: 0.3 } }
      : { opacity: 0, x: `${dir * -4}%`, scale: 0.98, transition: { duration: 0.5, ease: EASE_OUT } },
};

interface ImageCarouselProps {
  images: string[];
  /** Accessible name of image `n` (1-based). */
  label: (n: number) => string;
  /** Set to drive the carousel from outside (e.g. gallery thumbnails); omit to let it keep its own position. */
  index?: number;
  onIndexChange?: (index: number) => void;
  /** `card`: arrows appear on hover/focus, dots underneath; `gallery`: arrows always shown, no dots. */
  variant?: "card" | "gallery";
  /** Extra classes for each photo (e.g. grayscale for sold-out items). */
  imageClassName?: string;
  /** Lifts the dots, e.g. while a card's quick-view button covers the bottom edge. */
  dotsClassName?: string;
  eager?: boolean;
  className?: string;
}

/**
 * One square that shows a product's photos one at a time: arrows, swipe on touch
 * screens, and the left/right keys move between them. The incoming photo slides in
 * from the side it came from while sharpening and settling from a slight zoom; with
 * reduced motion it only fades. Clicks that end a swipe are swallowed, so a card
 * wrapped in a link doesn't navigate when someone just swiped through its photos.
 */
export function ImageCarousel({
  images,
  label,
  index,
  onIndexChange,
  variant = "card",
  imageClassName,
  dotsClassName,
  eager = false,
  className,
}: ImageCarouselProps) {
  const { t } = useI18n();
  const reduce = useReducedMotion() ?? false;
  const count = images.length;
  const [state, setState] = useState({ index: index ?? 0, dir: 1 });
  // Follow a controlled index (thumbnail click), animating in the matching direction.
  if (index !== undefined && index !== state.index) {
    setState({ index, dir: index > state.index ? 1 : -1 });
  }
  const current = Math.min(state.index, Math.max(0, count - 1));
  const swiped = useRef(false);

  function go(delta: number) {
    if (count < 2) return;
    const next = (current + delta + count) % count;
    setState({ index: next, dir: delta });
    onIndexChange?.(next);
  }

  function step(e: MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    go(delta);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) go(1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) go(-1);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else return;
    e.preventDefault();
  }

  // Warm the neighbours so the next photo is ready when the transition starts.
  useEffect(() => {
    if (count < 2) return;
    for (const src of [images[(current + 1) % count], images[(current - 1 + count) % count]]) {
      if (src && isRealImageSrc(src)) new Image().src = src;
    }
  }, [current, count, images]);

  const src = images[current];
  if (!src) return null;
  const multiple = count > 1;

  return (
    <div
      className={cn("relative aspect-square overflow-hidden", className)}
      onClickCapture={(e) => {
        if (!swiped.current) return;
        swiped.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={multiple ? handleKeyDown : undefined}
      {...(multiple ? { role: "group", "aria-roledescription": t.gallery.carousel } : {})}
    >
      <AnimatePresence initial={false} custom={{ dir: state.dir, reduce }}>
        <motion.div
          key={current}
          custom={{ dir: state.dir, reduce }}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
          style={{ touchAction: "pan-y" }}
          {...(multiple
            ? {
                drag: "x" as const,
                dragConstraints: { left: 0, right: 0 },
                dragElastic: 0.25,
                dragDirectionLock: true,
                onDragStart: () => {
                  swiped.current = true;
                },
                onDragEnd: handleDragEnd,
              }
            : {})}
        >
          <ProductMedia
            src={src}
            ratio="fill"
            // On a card the surrounding link already names the product.
            label={variant === "gallery" ? label(current + 1) : undefined}
            eager={eager && current === 0}
            className={cn("pointer-events-none h-full w-full select-none", imageClassName)}
          />
        </motion.div>
      </AnimatePresence>

      {multiple ? (
        <>
          {(
            [
              [-1, t.gallery.previous, ChevronLeft, "left-3"],
              [1, t.gallery.next, ChevronRight, "right-3"],
            ] as const
          ).map(([delta, name, Icon, side]) => (
            <button
              key={delta}
              type="button"
              aria-label={name}
              onClick={(e) => step(e, delta)}
              className={cn(
                "absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white focus-visible:opacity-100",
                side,
                variant === "card"
                  ? "h-8 w-8 opacity-0 group-hover:opacity-100"
                  : "h-10 w-10 opacity-80 hover:opacity-100",
              )}
            >
              <Icon size={variant === "card" ? 16 : 20} />
            </button>
          ))}
          {variant === "card" ? (
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5 transition-transform duration-300",
                dotsClassName,
              )}
            >
              {images.map((image, i) => (
                <span
                  key={`${i}-${image}`}
                  className={cn(
                    "h-1.5 rounded-full bg-white shadow-sm transition-all duration-500",
                    i === current ? "w-5 opacity-100" : "w-1.5 opacity-60",
                  )}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
