import { useState } from "react";
import { brand as currentBrand, type Brand } from "@/config/brand";
import { patchOverrides } from "@/lib/adminStore";
import { AdminButton, Field, SavedBanner, SectionCard, TextArea, TextInput } from "@/pages/admin/controls";

export function BrandTab() {
  const [form, setForm] = useState<Brand>(() => structuredClone(currentBrand));
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Brand>(key: K, value: Brand[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }
  function setContact<K extends keyof Brand["contact"]>(key: K, value: string) {
    setForm((f) => ({ ...f, contact: { ...f.contact, [key]: value } }));
    setSaved(false);
  }
  function setSocial<K extends keyof Brand["social"]>(key: K, value: string) {
    setForm((f) => ({ ...f, social: { ...f.social, [key]: value } }));
    setSaved(false);
  }

  function handleSave() {
    // copyrightYear is always computed fresh, never frozen by a saved override.
    patchOverrides({ brand: { ...form, copyrightYear: new Date().getFullYear() } });
    setSaved(true);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Marka & İletişim</h2>
        <p className="text-sm text-black/55">Site adı, slogan, açıklama ve iletişim bilgileri — bu değerler tüm sitede kullanılır.</p>
      </div>

      <SectionCard title="Kimlik">
        <Field label="Marka Adı">
          <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Kısa Ad" hint="Rozet/logo gibi küçük alanlarda kullanılır.">
          <TextInput value={form.shortName} onChange={(e) => set("shortName", e.target.value)} />
        </Field>
        <Field label="Slogan">
          <TextInput value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Açıklama">
          <TextArea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Yasal/Ticari Ünvan" hint="Footer'daki telif hakkı satırında kullanılır.">
          <TextInput value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard title="İletişim Bilgileri">
        <Field label="E-posta">
          <TextInput type="email" value={form.contact.email} onChange={(e) => setContact("email", e.target.value)} />
        </Field>
        <Field label="Telefon">
          <TextInput value={form.contact.phone} onChange={(e) => setContact("phone", e.target.value)} />
        </Field>
        <Field label="Adres">
          <TextInput value={form.contact.address} onChange={(e) => setContact("address", e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard title="Sosyal Medya">
        <Field label="Instagram">
          <TextInput value={form.social.instagram} onChange={(e) => setSocial("instagram", e.target.value)} />
        </Field>
        <Field label="Pinterest">
          <TextInput value={form.social.pinterest} onChange={(e) => setSocial("pinterest", e.target.value)} />
        </Field>
        <Field label="Facebook">
          <TextInput value={form.social.facebook} onChange={(e) => setSocial("facebook", e.target.value)} />
        </Field>
        <Field label="TikTok">
          <TextInput value={form.social.tiktok} onChange={(e) => setSocial("tiktok", e.target.value)} />
        </Field>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4">
        <AdminButton onClick={handleSave}>Kaydet</AdminButton>
        <SavedBanner show={saved} onReload={() => window.location.reload()} />
      </div>
    </div>
  );
}
