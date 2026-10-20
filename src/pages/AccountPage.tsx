import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";

export function AccountPage() {
  return (
    <Section containerSize="sm">
      <div className="mx-auto max-w-md text-center">
        <h1>Hesabım</h1>
        <p className="mt-4 text-body/60">
          Müşteri hesapları, sipariş geçmişi ve giriş bu demoda gerçek bir backend'e bağlı değil —
          bu sayfa, header'daki hesap ikonunun kırık bir bağlantıya götürmemesi için var. Sepet ve
          favoriler ise gerçekten çalışıyor (localStorage üzerinde). Gerçek kimlik doğrulamayı bir
          backend hazır olduğunda buraya bağlayın.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button href="/favoriler" variant="outline">
            Favorilerim
          </Button>
          <Button href="/">Ana Sayfaya Dön</Button>
        </div>
      </div>
    </Section>
  );
}
