import { useParams } from "react-router-dom";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

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
  const title = toTitleCase(slug);

  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-xs uppercase tracking-wide text-body/50">Sayfa</p>
        <h1 className="mt-1">{title}</h1>
        <p className="mt-4 text-body/60">
          Bu sayfanın gerçek içeriği bu build aşamasının kapsamında değildi — hiçbir link kırık
          kalmasın diye yönlendirilebilir durumda, içeriğini{" "}
          <code className="rounded bg-paper-soft px-1.5 py-0.5">src/config/content.ts</code> üzerinden
          doldurabilirsiniz.
        </p>
        <Button href="/" className="mt-6">
          Ana Sayfaya Dön
        </Button>
      </div>
    </Section>
  );
}
