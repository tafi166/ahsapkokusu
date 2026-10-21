import { useState } from "react";
import { adminApi, CONTENT_KEYS, errorMessage } from "@/lib/adminApi";
import { TRANSLATION_KEYS } from "@/i18n/content/types";
import { importToServer, parseBackup, type ImportResult } from "@/lib/adminImport";
import { clearLegacyBrowserOverrides, loadLegacyBrowserOverrides } from "@/lib/adminStore";
import { AdminButton, SectionCard } from "@/pages/admin/controls";

function describe(result: ImportResult): { message: string | null; error: string | null } {
  const message = result.saved.length > 0 ? `Sunucuya kaydedildi: ${result.saved.join(", ")}. Sitede görmek için sayfayı yenileyin.` : null;
  const error =
    result.failed.length > 0 ? `Kaydedilemeyenler — ${result.failed.map((f) => `${f.key}: ${f.error}`).join(" · ")}` : null;
  return { message, error };
}

/**
 * Edits live on the API server. Export downloads what the server currently
 * serves; import writes a file back through the same validation as the
 * other tabs. Edits made with the earlier browser-only panel can be moved
 * to the server from here.
 */
export function BackupTab() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState(() => loadLegacyBrowserOverrides());

  async function run(task: () => Promise<{ message: string | null; error: string | null }>) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const outcome = await task();
      setMessage(outcome.message);
      setError(outcome.error);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    void run(async () => {
      const res = await fetch("/api/site", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Sunucudaki içerik alınamadı.");
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "parametrika-icerik-yedek.json";
      a.click();
      URL.revokeObjectURL(url);
      return { message: "Yedek dosyası indirildi.", error: null };
    });
  }

  function handleImport(file: File) {
    void run(async () => describe(await importToServer(parseBackup(await file.text()))));
  }

  function handleMigrate() {
    if (!legacy) return;
    void run(async () => {
      const result = await importToServer(legacy);
      if (result.failed.length === 0) {
        clearLegacyBrowserOverrides();
        setLegacy(null);
      }
      return describe(result);
    });
  }

  function handleReset() {
    if (!window.confirm("Tüm metin içerikleri ve İngilizce çeviriler varsayılana dönsün mü? Ürünler ve kategoriler değişmez.")) return;
    void run(async () => {
      for (const key of CONTENT_KEYS) await adminApi.resetContent(key);
      for (const key of TRANSLATION_KEYS) await adminApi.resetTranslation("en", key);
      return { message: "Metin içerikleri varsayılana döndü. Sitede görmek için sayfayı yenileyin.", error: null };
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Yedekle & Sıfırla</h2>
        <p className="text-sm text-black/55">
          Düzenlemeler sunucuda saklanır ve tüm ziyaretçilere gösterilir. Yedek almak veya içeriği başka bir kuruluma
          taşımak için dışa/içe aktarmayı kullanın.
        </p>
      </div>

      {legacy ? (
        <SectionCard
          title="Bu tarayıcıda eski düzenlemeler var"
          description="Panelin önceki sürümünde yapılan düzenlemeler yalnızca bu tarayıcıda kalmıştı. Sunucuya aktarın ki herkes görsün."
        >
          <AdminButton onClick={handleMigrate} disabled={busy}>
            Sunucuya Aktar
          </AdminButton>
        </SectionCard>
      ) : null}

      <SectionCard title="Dışa Aktar">
        <p className="text-sm text-black/60">Sunucudaki tüm içeriği (ürünler, kategoriler, metinler) tek bir JSON dosyası olarak indirin.</p>
        <AdminButton onClick={handleExport} disabled={busy}>
          JSON Olarak İndir
        </AdminButton>
      </SectionCard>

      <SectionCard title="İçe Aktar">
        <p className="text-sm text-black/60">
          Daha önce dışa aktarılmış bir JSON dosyasını yükleyin — dosyada bulunan bölümler sunucudakilerin üzerine yazılır.
        </p>
        <input
          type="file"
          accept="application/json"
          aria-label="Yedek dosyası seç"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
          className="text-sm"
        />
      </SectionCard>

      <SectionCard title="Metinleri Sıfırla" description="Marka, ana sayfa ve liste metinleri varsayılana döner. Ürünler ve kategoriler değişmez.">
        <AdminButton variant="danger" onClick={handleReset} disabled={busy}>
          Metinleri Sıfırla
        </AdminButton>
      </SectionCard>

      {busy ? <p className="text-sm text-black/50">İşleniyor…</p> : null}
      {message ? (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
