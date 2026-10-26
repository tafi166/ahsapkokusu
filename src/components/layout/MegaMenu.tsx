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
          initial={{ opacity: 0, y: 10, clipPath: "inset(0 0 100% 0)" }}
          animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.2 } }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          // Aligned to the item's left edge: centred, the first item's menu ran off the screen.
          className="absolute left-0 top-full z-40 w-72 rounded-card border border-line bg-paper p-2 shadow-[0_24px_48px_-20px_rgba(30,25,21,0.3)]"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              role="menuitem"
              onClick={onNavigate}
              className="block rounded-md px-4 py-2.5 text-[15px] text-ink transition-all duration-300 hover:bg-paper-soft hover:pl-5 hover:text-accent-deep"
            >
              {link.label}
            </Link>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
