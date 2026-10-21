import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-md text-center">
        <p className="font-heading text-6xl">404</p>
        <h1 className="mt-4">{t.pages.notFoundTitle}</h1>
        <p className="mt-3 text-body/60">{t.pages.notFoundBody}</p>
        <Button href="/" className="mt-6">
          {t.pages.backHome}
        </Button>
      </div>
    </Section>
  );
}
