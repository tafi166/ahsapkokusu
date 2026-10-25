import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { primaryNav } from "@/config/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useI18n } from "@/i18n/I18nProvider";
import { alternatePath, localePath } from "@/i18n/paths";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { pathname, search } = useLocation();
  const otherLocale = locale === "tr" ? "en" : "tr";
  const [expanded, setExpanded] = useState<string | null>(null);
  useScrollLock(open);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 xl:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.nav
            aria-label={t.header.mobileNav}
            className="fixed inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col bg-paper shadow-2xl xl:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.455, 0.03, 0.515, 0.955] }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <Link to={localePath("/")} onClick={onClose} className="brand-home-link rounded-sm">
                <BrandLogo className="w-[148px]" />
              </Link>
              <button onClick={onClose} aria-label={t.header.closeMenu} className="p-1">
                <X size={22} />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-2 py-4">
              {primaryNav(t).map((item) => {
                const isExpanded = expanded === item.label;
                return (
                  <li key={item.label} className="border-b border-line last:border-none">
                    {item.children ? (
                      <>
                        <button
                          className="flex w-full items-center justify-between px-4 py-4 text-left text-sm"
                          onClick={() => setExpanded(isExpanded ? null : item.label)}
                          aria-expanded={isExpanded}
                        >
                          {item.label}
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {isExpanded ? (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden bg-paper-soft"
                            >
                              {item.children.map((child) => (
                                <li key={child.href}>
                                  <Link
                                    to={child.href}
                                    onClick={onClose}
                                    className="block px-8 py-3 text-sm text-body/80"
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              ))}
                            </motion.ul>
                          ) : null}
                        </AnimatePresence>
                      </>
                    ) : (
                      <Link to={item.href} onClick={onClose} className="block px-4 py-4 text-sm">
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center gap-4 border-t border-line px-6 py-5">
              <Link to={localePath("/favoriler")} onClick={onClose} className="text-sm text-body/70">
                {t.header.favourites}
              </Link>
              <Link to={localePath("/hesabim")} onClick={onClose} className="text-sm text-body/70">
                {t.header.account}
              </Link>
              <a
                href={alternatePath(pathname + search, otherLocale, locale)}
                hrefLang={otherLocale}
                lang={otherLocale}
                className="ml-auto text-sm text-body/70 underline"
              >
                {t.locale[otherLocale]}
              </a>
            </div>
          </motion.nav>
        </>
      ) : null}
    </AnimatePresence>
  );
}
