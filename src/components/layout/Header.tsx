import { Link } from "react-router-dom";
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

export function Header() {
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
              aria-label="Menüyü aç"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>

            <Link to="/" className="font-heading text-xl tracking-wide md:text-2xl">
              {brand.name}
            </Link>

            <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
              {primaryNav.map((item) => (
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
              <button
                aria-label="Ürün ara"
                className="rounded-full p-2 transition-colors hover:bg-paper-soft"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={19} />
              </button>
              <Link
                to="/favoriler"
                aria-label={`Favoriler, ${wishlistCount} ürün`}
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
                to="/hesabim"
                aria-label="Hesabım"
                className="hidden rounded-full p-2 transition-colors hover:bg-paper-soft sm:inline-flex"
              >
                <User size={19} />
              </Link>
              <button
                aria-label={`Sepeti aç, ${itemCount} ürün`}
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
