import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { request, errorMessage } from "@/lib/adminApi";
import { Field, TextInput, TextArea } from "../controls";

export interface ResearchImage {
  id: string;
  productName: string;
  fileName: string;
  sizeBytes: number;
  width: number;
  height: number;
}
export interface ImageBatch {
  id: string;
  title: string;
  sourceUrl: string;
  permissionBasis: string;
  permissionNote: string;
  permissionUntil: string | null;
  expiresAt: string;
  revoked: boolean;
  images: ResearchImage[];
}
interface ExportJob {
  id: string;
  status: string;
  error: string | null;
  imageIds: string[];
  expiresAt: string;
  sizeBytes: number | null;
}
const base = "/api/admin/research/images";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-divider bg-paper px-4 py-2 text-sm text-ink hover:bg-warm-soft disabled:opacity-50";
const label: Record<string, string> = {
  QUEUED: "Sırada",
  RUNNING: "Hazırlanıyor",
  READY: "Hazır",
  FAILED: "Başarısız",
  CANCELLED: "İptal edildi",
};
function allowed(batch: ImageBatch, now: number) {
  return (
    !batch.revoked &&
    Date.parse(batch.expiresAt) > now &&
    (!batch.permissionUntil || Date.parse(batch.permissionUntil) > now)
  );
}
export function ImageDownloads() {
  const [params, setParams] = useSearchParams();
  const [now, setNow] = useState(() => Date.now());
  const [batches, setBatches] = useState<ImageBatch[]>([]),
    [jobs, setJobs] = useState<ExportJob[]>([]);
  const [source, setSource] = useState(""),
    [title, setTitle] = useState(""),
    [basis, setBasis] = useState("OWNED"),
    [note, setNote] = useState(""),
    [until, setUntil] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const [product, setProduct] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const batch = batches.find((b) => b.id === params.get("batch"));
  async function load() {
    const [groups, exports] = await Promise.all([
      request<ImageBatch[]>("GET", `${base}/batches`),
      request<ExportJob[]>("GET", `${base}/exports`),
    ]);
    setBatches(groups);
    setJobs(exports);
  }
  useEffect(() => {
    let active = true;
    void Promise.all([
      request<ImageBatch[]>("GET", `${base}/batches`),
      request<ExportJob[]>("GET", `${base}/exports`),
    ])
      .then(([groups, exports]) => {
        if (active) {
          setBatches(groups);
          setJobs(exports);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setInterval(() => {
      void request<ExportJob[]>("GET", `${base}/exports`)
        .then((rows) => {
          if (active) {
            setJobs(rows);
            setNow(Date.now());
          }
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    }, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  function choose(id: string) {
    setParams((old) => {
      const next = new URLSearchParams(old);
      next.set("batch", id);
      return next;
    });
    setSelected([]);
    setProduct("");
  }
  async function act(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: File[]) {
    if (!batch) return;
    const failures: string[] = [];
    await act(async () => {
      if (!files.length || files.length + batch.images.length > 50)
        throw new Error("Her grupta en fazla 50 görsel olabilir.");
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        setProgress(`Yükleniyor: ${i + 1}/${files.length}`);
        try {
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024
          )
            throw new Error("JPEG/PNG/WebP, en fazla 5 MB");
          const query = new URLSearchParams({
            productName: product,
            fileName: file.name,
          });
          await request(
            "POST",
            `${base}/batches/${batch.id}/upload?${query}`,
            file,
          );
        } catch (e) {
          failures.push(`${file.name}: ${errorMessage(e)}`);
        }
      }
      await load();
      setMessage("Yükleme tamamlandı. Aynı içerikteki görseller tekrarlanmaz.");
      if (failures.length) setError(failures.join(" · "));
    });
    setProgress("");
    if (fileRef.current) fileRef.current.value = "";
  }
  function downloadAllowed(job: ExportJob) {
    return job.imageIds.every((id) => {
      const group = batches.find((g) => g.images.some((im) => im.id === id));
      return !!group && allowed(group, now);
    });
  }
  const countBytes = selected.reduce(
    (sum, id) =>
      sum + (batch?.images.find((im) => im.id === id)?.sizeBytes ?? 0),
    0,
  );
  return (
    <div className="space-y-5">
      <h3 className="text-xl">Görsel İndir</h3>
      <p className="text-sm">
        Etsy bağlantısından otomatik alma henüz bağlı değil. İzinli olarak elde
        ettiğiniz görselleri tabletinizden yükleyip seçerek ZIP
        indirebilirsiniz. Görseller mağazada yayımlanmaz.
      </p>
      {error && (
        <p
          role="alert"
          className="break-words rounded border border-danger p-3 text-sm"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      )}
      <form
        className="space-y-3 rounded-lg bg-paper p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            const row = await request<ImageBatch>("POST", `${base}/batches`, {
              title,
              sourceUrl: source,
              permissionBasis: basis,
              permissionNote: note,
              permissionUntil: until
                ? new Date(`${until}T23:59:59Z`).toISOString()
                : null,
              confirmed,
            });
            await load();
            choose(row.id);
            setMessage(
              "Özel galeri oluşturuldu. İzin bilgisi kullanıcı beyanıdır; ticari yayın izni olarak doğrulanmamıştır.",
            );
          });
        }}
      >
        <Field label="Mağaza veya ürün bağlantısı">
          <TextInput
            required
            type="url"
            pattern="https://.*"
            maxLength={2048}
            value={source}
            disabled={busy}
            onChange={(e) => setSource(e.target.value)}
          />
        </Field>
        <button
          type="button"
          className={button}
          disabled={busy || !source}
          onClick={() =>
            void act(async () => {
              const result = await request<{ message: string }>(
                "POST",
                `${base}/inspect`,
                { url: source },
              );
              setMessage(result.message);
            })
          }
        >
          Etsy bağlantısını kontrol et
        </button>
        <Field label="Galeri adı">
          <TextInput
            required
            maxLength={160}
            value={title}
            disabled={busy}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="İzin dayanağı">
          <select
            className="min-h-11 w-full rounded border border-divider px-3"
            value={basis}
            disabled={busy}
            onChange={(e) => setBasis(e.target.value)}
          >
            <option value="OWNED">Kendi mağazam / görsellerim</option>
            <option value="AUTHORIZED">Görselleri indirme yetkim var</option>
          </select>
        </Field>
        <Field label="İzin açıklaması veya belge referansı">
          <TextArea
            required
            minLength={5}
            maxLength={2000}
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <Field label="İzin son günü (isteğe bağlı, UTC)">
          <TextInput
            type="date"
            value={until}
            disabled={busy}
            onChange={(e) => setUntil(e.target.value)}
          />
        </Field>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            required
            checked={confirmed}
            disabled={busy}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Bu görselleri özel alana yükleme ve indirme yetkim olduğunu beyan
          ediyorum. Bu işlem ticari yayın izni sağlamaz.
        </label>
        <button className={button} disabled={busy || !confirmed}>
          Özel galeri oluştur
        </button>
      </form>
      <Field label="Galeriler (son 100)">
        <select
          className="min-h-11 w-full rounded border border-divider bg-paper px-3"
          value={batch?.id ?? ""}
          disabled={busy}
          onChange={(e) => choose(e.target.value)}
        >
          <option value="">Bir galeri seçin</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
              {!allowed(b, now) ? " — erişim kapalı" : ""}
            </option>
          ))}
        </select>
      </Field>
      {batch && (
        <div className="space-y-4">
          <div className="rounded border border-line p-3 text-sm">
            <p>
              {batch.title} · {batch.images.length}/50 görsel
            </p>
            <p className="break-all">Kaynak: {batch.sourceUrl}</p>
            <p>
              İzin:{" "}
              {batch.permissionBasis === "OWNED"
                ? "Kendi görselleri beyanı"
                : "Yetki beyanı"}{" "}
              · bağımsız doğrulama yapılmadı.
            </p>
            <p>
              Görsellerin saklama süresi:{" "}
              {new Date(batch.expiresAt).toLocaleString("tr-TR")}
            </p>
            {!allowed(batch, now) ? (
              <p className="text-danger">
                İzin iptal edilmiş veya süresi dolmuş. Önizleme ve indirme
                kapalı.
              </p>
            ) : (
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Bu galerinin önizleme ve indirme iznini iptal etmek istiyor musunuz?",
                    )
                  )
                    void act(async () => {
                      await request(
                        "PATCH",
                        `${base}/batches/${batch.id}/revoke`,
                      );
                      setSelected([]);
                      await load();
                    });
                }}
              >
                İzni iptal et
              </button>
            )}
          </div>
          {allowed(batch, now) && (
            <>
              <Field label="Yüklenecek görsellerin ürün adı">
                <TextInput
                  maxLength={160}
                  value={product}
                  disabled={busy}
                  onChange={(e) => setProduct(e.target.value)}
                />
              </Field>
              <Field label="Tabletten görsel seç (JPEG, PNG, WebP; dosya başına 5 MB)">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy || !product.trim()}
                  className="min-h-11 w-full text-sm"
                  onChange={(e) =>
                    void upload(Array.from(e.target.files ?? []))
                  }
                />
              </Field>
              {progress && <p role="status">{progress}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  disabled={busy || !batch.images.length}
                  onClick={() => setSelected(batch.images.map((i) => i.id))}
                >
                  Tüm görselleri seç
                </button>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => setSelected([])}
                >
                  Seçimi temizle
                </button>
              </div>
              <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {batch.images.map((im) => (
                  <li
                    key={im.id}
                    className="min-w-0 space-y-2 rounded-lg border border-line bg-paper p-3"
                  >
                    <a
                      href={`${base}/files/${im.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${im.fileName} önizlemesini aç`}
                    >
                      <img
                        src={`${base}/files/${im.id}`}
                        alt={im.fileName}
                        loading="lazy"
                        className="aspect-square w-full rounded object-contain"
                      />
                    </a>
                    <label className="flex min-h-11 items-center gap-2 break-all text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(im.id)}
                        disabled={busy}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, im.id]
                              : selected.filter((id) => id !== im.id),
                          )
                        }
                      />
                      {im.productName}
                    </label>
                    <p className="break-all text-xs">
                      {im.fileName} · {im.width}×{im.height}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-divider bg-paper p-3 shadow-lg">
                <span className="text-sm">
                  {selected.length} seçili ·{" "}
                  {(countBytes / 1024 / 1024).toFixed(1)} MB / 50 MB
                </span>
                <button
                  className={button}
                  disabled={
                    busy || !selected.length || countBytes > 50 * 1024 * 1024
                  }
                  onClick={() =>
                    void act(async () => {
                      await request("POST", `${base}/exports`, {
                        imageIds: selected,
                      });
                      await load();
                      setMessage(
                        "ZIP sıraya alındı. Ekranı kapatsanız da sunucuda hazırlanır.",
                      );
                    })
                  }
                >
                  Seçilenleri ZIP hazırla
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <h4 className="text-lg">ZIP paketleri</h4>
      <p className="text-sm">
        Hazır paketler 24 saat saklanır. Her indirmede izin ve oturum yeniden
        kontrol edilir. Görseller 7 gün sonra temizlenir.
      </p>
      <ul className="space-y-3">
        {jobs.map((job) => (
          <li
            key={job.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-paper p-3 text-sm"
          >
            <span>
              {job.imageIds.length} görsel · {label[job.status] ?? job.status}
            </span>
            {job.status === "READY" && !downloadAllowed(job) && (
              <span>İzin veya kaynak erişimi kapalı.</span>
            )}
            {job.error && <span className="text-danger">{job.error}</span>}
            {job.status === "READY" &&
              Date.parse(job.expiresAt) > now &&
              downloadAllowed(job) && (
                <a
                  className={button}
                  href={`${base}/exports/${job.id}/download`}
                >
                  ZIP indir
                </a>
              )}
            {["QUEUED", "RUNNING"].includes(job.status) && (
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await request("PATCH", `${base}/exports/${job.id}/cancel`);
                    await load();
                  })
                }
              >
                İptal et
              </button>
            )}
            {["FAILED", "CANCELLED"].includes(job.status) && (
              <button
                className={button}
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await request("POST", `${base}/exports`, {
                      imageIds: job.imageIds,
                    });
                    await load();
                  })
                }
              >
                Yeniden hazırla
              </button>
            )}
          </li>
        ))}
      </ul>
      {!jobs.length && <p className="text-sm">Henüz ZIP paketi yok.</p>}
    </div>
  );
}
