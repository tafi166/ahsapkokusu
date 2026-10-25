import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { NavLink } from "@/types";

export function MegaMenu({
  open,
  links,
  id,
  onNavigate,
}: {
  open: boolean;
  links: NavLink[];
  id: string;
  /** Called when a link is chosen, so the menu closes instead of covering the page it opened. */
  onNavigate?: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          id={id}
          role="menu"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          // Aligned to the item's left edge: centred, the first item's menu ran off the screen.
          className="absolute left-0 top-full z-40 w-72 rounded-card border border-line bg-white p-2 shadow-lg"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              role="menuitem"
              onClick={onNavigate}
              className="block rounded-md px-4 py-2.5 text-sm text-ink transition-colors hover:bg-paper-soft hover:text-accent-deep"
            >
              {link.label}
            </Link>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
