import { useRef, useState } from "react";
import { exportOverridesAsJson, importOverridesFromJson, resetOverrides } from "@/lib/adminStore";
import { AdminButton, SectionCard } from "@/pages/admin/controls";

/**
 * All admin edits live in this browser's localStorage only — there's no
 * server (see README "Known limitations"), so nothing here is synced
 * across browsers/devices, and it won't survive the user clearing site
 * data. Export/import is the way to move edits to another browser, back
 * them up before clearing data, or hand them to a developer to bake into
 * the next deploy.
 */
export function BackupTab() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = exportOverridesAsJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parametrika-admin-yedek.json";
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Yedek dosyası indirildi.");
    setError(null);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const ok = importOverridesFromJson(text);
      if (ok) {
        setMessage("İçe aktarıldı. Sitede görmek için sayfayı yenileyin.");
        setError(null);
      } else {
        setMessage(null);
        setError("Kaydedilemedi — tarayıcı depolama alanı dolu olabilir (özellikle ürün görselleri büyükse).");
      }
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : "Dosya okunamadı.");
    }
  }

  function handleReset() {
    resetOverrides();
    setMessage("Tüm admin değişiklikleri sıfırlandı (varsayılan içerik geri geldi). Sitede görmek için sayfayı yenileyin.");
    setError(null);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Yedekle & Sıfırla</h2>
        <p className="text-sm text-black/55">
          Bu panelde yaptığınız tüm değişiklikler yalnızca bu tarayıcıda saklanır (gerçek bir sunucu yok). Başka bir
          tarayıcıya taşımak, yedek almak veya bir sonraki yayına dahil etmek için dışa/içe aktarma kullanın.
        </p>
      </div>

      <SectionCard title="Dışa Aktar">
        <p className="text-sm text-black/60">Yapılan tüm değişiklikleri tek bir JSON dosyası olarak indirin.</p>
        <AdminButton onClick={handleExport}>JSON Olarak İndir</AdminButton>
      </SectionCard>

      <SectionCard title="İçe Aktar">
        <p className="text-sm text-black/60">Daha önce dışa aktarılmış bir JSON dosyasını yükleyin — mevcut değişikliklerin üzerine yazılır.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          aria-label="Yedek dosyası seç"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
          }}
          className="text-sm"
        />
      </SectionCard>

      <SectionCard title="Sıfırla" description="Bu tarayıcıda yapılmış tüm admin değişikliklerini siler; site varsayılan içeriğe döner.">
        <AdminButton variant="danger" onClick={handleReset}>
          Tümünü Sıfırla
        </AdminButton>
      </SectionCard>

      {message ? <p role="status" className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
