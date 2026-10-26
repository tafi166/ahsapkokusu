import { Link } from "react-router-dom";
import { brand } from "@/config/brand";
import { footerColumns } from "@/config/navigation";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { localePath } from "@/i18n/paths";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/i18n/I18nProvider";

// lucide-react no longer ships trademarked brand marks — plain text
// abbreviations avoid reproducing a logo we don't have rights to.
const socialLinks = [
  { label: "Instagram", short: "IG", href: brand.social.instagram },
  { label: "Facebook", short: "FB", href: brand.social.facebook },
];

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-footer-bg text-footer-ink">
      <Container size="lg" className="py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link to={localePath("/")} className="brand-home-link inline-block rounded-sm">
              <BrandLogo inverse className="w-[220px]" />
            </Link>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-footer-link">{brand.description}</p>
            <div className="mt-5 flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-footer-border text-[11px] tracking-wide transition-colors duration-500 hover:border-footer-ink hover:bg-footer-ink hover:text-footer-bg"
                >
                  {social.short}
                </a>
              ))}
            </div>
          </div>

          {footerColumns(t).map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="mb-5 font-body text-[11px] font-medium uppercase tracking-[0.24em] text-brass">
                {column.title}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="link-draw text-sm text-footer-link transition-colors duration-300 hover:text-footer-link-hover"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-footer-border pt-8 text-xs text-footer-link md:flex-row md:justify-between">
          <p>
            © {brand.copyrightYear} {brand.legalName}. {t.footer.rights}
          </p>
        </div>
      </Container>
    </footer>
  );
}
