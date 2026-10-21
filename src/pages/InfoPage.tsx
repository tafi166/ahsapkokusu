import { useParams } from "react-router-dom";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";
import { pageSegment, turkishPath } from "@/i18n/paths";

function toTitleCase(slug: string): string {
  return slug
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generic content page for routes whose real copy wasn't part of this
 * phase's scope (Hakkımızda, politikalar, vb.) — every nav/footer link
 * resolves to a real, styled page instead of a 404, but the body copy
 * is honestly marked as a placeholder rather than invented.
 */
export function InfoPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { t } = useI18n();
  // Router paths are in the page language; the known pages are keyed by their Turkish slug.
  const trSlug = turkishPath(`/${pageSegment("sayfa")}/${slug}`).split("/")[2] ?? slug;
  const knownTitles: Record<string, string> = {
    hakkimizda: t.nav.about,
    "kullanim-sartlari": t.nav.terms,
    "iade-politikasi": t.nav.returns,
    "kargo-politikasi": t.nav.shipping,
    "gizlilik-politikasi": t.nav.privacy,
  };
  const title = knownTitles[trSlug] ?? toTitleCase(slug);

  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs uppercase tracking-wide text-body/50">{t.pages.infoEyebrow}</p>
        <h1 className="mt-1">{title}</h1>
        <p className="mt-4 text-body/60">{t.pages.infoPlaceholder}</p>
        <Button href="/" className="mt-6">
          {t.pages.backHome}
        </Button>
      </div>
    </Section>
  );
}
