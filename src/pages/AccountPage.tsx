import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/paths";

export function AccountPage() {
  const { t } = useI18n();
  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-md text-center">
        <h1>{t.pages.accountTitle}</h1>
        <p className="mt-4 text-body/60">{t.pages.accountBody}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button href={localePath("/favoriler")} variant="outline">
            {t.pages.wishlistTitle}
          </Button>
          <Button href="/">{t.pages.backHome}</Button>
        </div>
      </div>
    </Section>
  );
}
