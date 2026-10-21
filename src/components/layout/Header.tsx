import { Link, useLocation } from "react-router-dom";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useState } from "react";
import { brand } from "@/config/brand";
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

export function Header() {
  const { t } = useI18n();
  const nav = primaryNav(t);
  const { isScrolled } = useStickyHeader();
  const { itemCount, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  return (
    <>
      <header className="sticky top-0 z-40 w-full">
        <AnnouncementBar />
        <div
          className={cn(
            "w-full border-b border-line bg-paper/95 backdrop-blur-sm transition-shadow duration-300",
            isScrolled && "shadow-sm",
          )}
        >
          <div className="mx-auto flex h-16 max-w-[1760px] items-center justify-between px-4 md:h-20 md:px-8">
            <button
              className="p-2 lg:hidden"
              aria-label={t.header.openMenu}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>

            <Link to="/" className="font-heading text-xl tracking-wide md:text-2xl">
              {brand.name}
            </Link>

            <nav aria-label={t.header.primaryNav} className="hidden items-center gap-1 lg:flex">
              {nav.map((item) => (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => item.children && setOpenMenu(item.label)}
                  onMouseLeave={() => item.children && setOpenMenu(null)}
                >
                  <Link
                    to={item.href}
                    className="flex items-center px-3 py-2 text-sm transition-colors hover:text-accent-deep"
                    aria-haspopup={item.children ? "menu" : undefined}
                    aria-expanded={item.children ? openMenu === item.label : undefined}
                  >
                    {item.label}
                  </Link>
                  {item.children ? (
                    <MegaMenu
                      open={openMenu === item.label}
                      links={item.children}
                      id={`menu-${item.label}`}
                    />
                  ) : null}
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <button
                aria-label={t.header.search}
                className="rounded-full p-2 transition-colors hover:bg-paper-soft"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={19} />
              </button>
              <Link
                to={localePath("/favoriler")}
                aria-label={t.header.wishlist(wishlistCount)}
                className="relative hidden rounded-full p-2 transition-colors hover:bg-paper-soft sm:inline-flex"
              >
                <Heart size={19} />
                {wishlistCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-deep text-[10px] text-white">
                    {wishlistCount}
                  </span>
                ) : null}
              </Link>
              <Link
                to={localePath("/hesabim")}
                aria-label={t.header.account}
                className="hidden rounded-full p-2 transition-colors hover:bg-paper-soft sm:inline-flex"
              >
                <User size={19} />
              </Link>
              <button
                aria-label={t.header.openCart(itemCount)}
                className="relative rounded-full p-2 transition-colors hover:bg-paper-soft"
                onClick={openCart}
              >
                <ShoppingBag size={19} />
                {itemCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-deep text-[10px] text-white">
                    {itemCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
