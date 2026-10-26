import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { primaryNav } from "@/config/navigation";
import { useStickyHeader } from "@/hooks/useStickyHeader";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { cn } from "@/lib/cn";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { useI18n, type Locale } from "@/i18n/I18nProvider";
import { alternatePath, localePath } from "@/i18n/paths";
import { ordersEnabled } from "@/config/shop";

/** Links to this page in each language — a full page load, since content is localized when the page loads. */
function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const { pathname, search } = useLocation();
  return (
    <div role="group" aria-label={t.locale.label} className="hidden items-center text-xs sm:flex">
      {(["tr", "en"] as Locale[]).map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 ? <span aria-hidden="true" className="px-0.5 text-body/30">|</span> : null}
          <a
            href={alternatePath(pathname + search, l, locale)}
            hrefLang={l}
            lang={l}
            aria-current={locale === l ? "true" : undefined}
            aria-label={t.locale[l]}
            className={cn("rounded px-1.5 py-1 uppercase", locale === l ? "font-semibold text-ink" : "text-body/50 hover:text-ink")}
          >
            {l}
          </a>
        </span>
      ))}
    </div>
  );
}

// No display class here: callers add `inline-flex`, or `hidden sm:inline-flex` (cn doesn't resolve conflicting classes).
const iconButton = "relative h-10 w-10 items-center justify-center rounded-full text-ink transition-colors duration-300 hover:bg-paper-soft hover:text-accent-deep";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-deep px-1 text-[10px] leading-none text-white">
      {count}
    </span>
  );
}

/**
 * Two rows on large screens: language, logo (centred) and icons; below them
 * the category menu on one centred line, so long category names never wrap.
 * Below 1280 px the logo row stands alone and the menu sits behind the burger.
 */
export function Header() {
  const { t } = useI18n();
  const nav = primaryNav(t);
  const { pathname } = useLocation();
  const { isScrolled } = useStickyHeader();
  const { itemCount, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isActive = (href: string) => {
    const path = href.split("?")[0]!;
    return path !== "/" && (pathname === path || pathname.startsWith(`${path}/`));
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full">
        <AnnouncementBar />
        <div
          className={cn(
            // Opaque: a see-through bar let the page scrolling underneath show as faint text.
            "w-full border-b border-line bg-paper transition-shadow duration-500",
            isScrolled && "shadow-[0_12px_32px_-18px_rgba(30,25,21,0.35)]",
          )}
        >
          <div className="mx-auto grid h-[72px] max-w-[1760px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:h-[88px] md:px-8">
            <div className="flex items-center">
              <button className={cn(iconButton, "-ml-2 mr-1 inline-flex xl:hidden")} aria-label={t.header.openMenu} onClick={() => setMobileOpen(true)}>
                <Menu size={22} />
              </button>
              <LanguageSwitcher />
            </div>

            <Link to={localePath("/")} className="brand-home-link rounded-sm p-1">
              <BrandLogo horizontal className="w-[168px] sm:w-[230px] md:w-[290px]" />
            </Link>

            <div className="flex items-center justify-end gap-0.5">
              <button aria-label={t.header.search} className={cn(iconButton, "inline-flex")} onClick={() => setSearchOpen(true)}>
                <Search size={19} />
              </button>
              <Link
                to={localePath("/favoriler")}
                aria-label={t.header.wishlist(wishlistCount)}
                className={cn(iconButton, "hidden sm:inline-flex")}
              >
                <Heart size={19} />
                <CountBadge count={wishlistCount} />
              </Link>
              <Link to={localePath("/hesabim")} aria-label={t.header.account} className={cn(iconButton, "hidden sm:inline-flex")}>
                <User size={19} />
              </Link>
              {ordersEnabled() ? (
                <button aria-label={t.header.openCart(itemCount)} className={cn(iconButton, "-mr-2 inline-flex")} onClick={openCart}>
                  <ShoppingBag size={19} />
                  <CountBadge count={itemCount} />
                </button>
              ) : null}
            </div>
          </div>

          <nav aria-label={t.header.primaryNav} className="hidden border-t border-line/70 xl:block">
            <ul className="mx-auto flex max-w-[1760px] items-center justify-center gap-x-1 px-8 2xl:gap-x-4">
              {nav.map((item, index) => {
                const active = isActive(item.href);
                return (
                  <li
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => item.children && setOpenMenu(item.label)}
                    onMouseLeave={() => item.children && setOpenMenu(null)}
                  >
                    <Link
                      to={item.href}
                      className={cn(
                        "group relative flex items-center gap-1 whitespace-nowrap px-3 py-3.5 text-[15px] tracking-[0.03em] transition-colors duration-300 hover:text-ink",
                        active ? "text-ink" : "text-body/80",
                      )}
                      aria-current={active ? "page" : undefined}
                      aria-haspopup={item.children ? "menu" : undefined}
                      aria-expanded={item.children ? openMenu === item.label : undefined}
                    >
                      {item.label}
                      {item.children && item.children.length > 0 ? (
                        <ChevronDown size={13} aria-hidden="true" className="opacity-50 transition-transform duration-500 ease-[var(--ease-premium)] group-hover:rotate-180" />
                      ) : null}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-3 bottom-2.5 h-px origin-left bg-brass transition-transform duration-500 ease-[var(--ease-premium)]",
                          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                        )}
                      />
                    </Link>
                    {item.children ? (
                      <MegaMenu
                        open={openMenu === item.label}
                        links={item.children}
                        id={`nav-menu-${index}`}
                        onNavigate={() => setOpenMenu(null)}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
