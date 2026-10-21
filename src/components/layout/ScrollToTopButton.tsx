import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useStickyHeader } from "@/hooks/useStickyHeader";
import { useI18n } from "@/i18n/I18nProvider";

export function ScrollToTopButton() {
  const { t } = useI18n();
  const { isScrolled } = useStickyHeader(480);

  return (
    <AnimatePresence>
      {isScrolled ? (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t.a11y.scrollTop}
          className="fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white shadow-lg transition-transform hover:scale-105"
        >
          <ArrowUp size={18} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
