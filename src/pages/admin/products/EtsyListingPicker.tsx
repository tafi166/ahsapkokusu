import { useEffect, useState } from "react";
import { request, errorMessage } from "@/lib/adminApi";
import type { ImageBatch } from "../research/ImageDownloads";
import { AdminButton } from "../controls";
interface Preview {
  ticket: string;
  title: string;
  images: { id: string; previewUrl: string }[];
  message: string;
  sourceInput: string;
}
export function EtsyListingPicker({
  url,
  onImported,
  onBusy,
}: {
  url: string;
  onImported: (batch: ImageBatch) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState<{
    configured: boolean;
    message: string;
  }>();
  const [preview, setPreview] = useState<Preview>();
  const [selection, setSelection] = useState<string[]>([]);
  const [permission, setPermission] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const current = preview?.sourceInput === url ? preview : undefined;
  useEffect(() => {
    let active = true;
    void request<{ configured: boolean; message: string }>(
      "GET",
      "/api/admin/research/images/etsy/status",
    )
      .then((state) => {
        if (active) setStatus(state);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div
      className="space-y-3 rounded-md border border-divider bg-paper p-4"
      aria-label="Etsy’den yeni görsel al"
    >
      <h4 className="text-base">Etsy’den yeni görsel getir</h4>
      <p className="text-sm">
        Yukarıya tek ürünün /listing/ bağlantısını girin. Görseller önce özel
        alana alınır; üründe yayımlamak için aşağıdaki yayın hakkı kaydı
        gerekir.
      </p>
      {!status ? (
        <p role="status">Etsy bağlantı ayarları kontrol ediliyor…</p>
      ) : !status.configured ? (
        <p className="text-sm">
          {status.message || "Etsy API erişimi bu sunucuda yapılandırılmamış."}
        </p>
      ) : (
        <p className="text-xs">
          API erişimi ilk ürün isteğinde doğrulanır. Yalnızca sunucuda izin
          verilen mağazalar desteklenir.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          disabled={busy}
          checked={permission}
          onChange={(e) => {
            setPermission(e.target.checked);
            if (!e.target.checked) {
              setPreview(undefined);
              setSelection([]);
            }
          }}
        />
        Bu kaynağın görsellerini görüntüleme ve özel alana alma yetkim var.
      </label>
      <AdminButton
        disabled={busy || !status?.configured || !url || !permission}
        onClick={() =>
          void run(async () => {
            setPreview(undefined);
            setSelection([]);
            const result = await request<Omit<Preview, "sourceInput">>(
              "POST",
              "/api/admin/research/images/etsy/preview",
              { url, sourcePermissionConfirmed: permission },
            );
            setPreview({ ...result, sourceInput: url });
          })
        }
      >
        Etsy’den yeni görselleri getir
      </AdminButton>
      {current && permission && (
        <>
          <p role="status" className="text-sm">
            {current.title} · {current.message}
          </p>
          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="outline"
              disabled={busy}
              onClick={() =>
                setSelection(current.images.map((image) => image.id))
              }
            >
              Etsy görsellerinin tümünü seç
            </AdminButton>
            <AdminButton
              variant="outline"
              disabled={busy}
              onClick={() => setSelection([])}
            >
              Etsy seçimini temizle
            </AdminButton>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {current.images.map((image, index) => (
              <li
                key={image.id}
                className="min-w-0 rounded border border-line p-2"
              >
                <img
                  className="aspect-square w-full object-contain"
                  src={image.previewUrl}
                  alt={`Etsy görsel ${index + 1}`}
                />
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={selection.includes(image.id)}
                    onChange={(e) =>
                      setSelection(
                        e.target.checked
                          ? [...selection, image.id]
                          : selection.filter((id) => id !== image.id),
                      )
                    }
                  />
                  Görsel {index + 1}
                </label>
              </li>
            ))}
          </ul>
          <AdminButton
            disabled={busy || !selection.length || selection.length > 12}
            onClick={() =>
              void run(async () => {
                const group = await request<ImageBatch>(
                  "POST",
                  "/api/admin/research/images/etsy/import",
                  { ticket: current.ticket, imageIds: selection },
                );
                onImported(group);
                setPreview(undefined);
                setSelection([]);
              })
            }
          >
            {busy
              ? "Görseller alınıyor…"
              : `Seçilen ${selection.length} Etsy görselini özel alana al`}
          </AdminButton>
          <p className="text-xs">
            Önizleme 5 dakika geçerlidir. En fazla 12 görsel, dosya başına 5 MB.
            Kaynak hatası olursa ürününüz değişmez.
          </p>
        </>
      )}
    </div>
  );
}
