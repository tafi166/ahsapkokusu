import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-md text-center">
        <p className="font-heading text-6xl">404</p>
        <h1 className="mt-4">Sayfa Bulunamadı</h1>
        <p className="mt-3 text-body/60">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        <Button href="/" className="mt-6">
          Ana Sayfaya Dön
        </Button>
      </div>
    </Section>
  );
}
