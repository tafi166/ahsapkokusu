import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { announcementMessages } from "@/config/content";

/** Rotating single-line announcement bar, cross-fades every few seconds. */
export function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (announcementMessages.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % announcementMessages.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex h-9 items-center justify-center overflow-hidden bg-ink px-4 text-center text-[11px] tracking-[0.04em] text-white/85 sm:uppercase sm:tracking-[0.2em]">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="truncate"
        >
          {announcementMessages[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
