import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductMedia } from "@/lib/placeholder";
import { cn } from "@/lib/cn";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="overflow-hidden rounded-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ProductMedia src={images[active]} ratio="square" label={`${title} — image ${active + 1}`} />
          </motion.div>
        </AnimatePresence>
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex gap-3" role="tablist" aria-label={`${title} thumbnails`}>
          {images.map((image, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={`Show image ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-input border-2 transition-colors",
                i === active ? "border-ink" : "border-transparent",
              )}
            >
              <ProductMedia src={image} ratio="square" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
