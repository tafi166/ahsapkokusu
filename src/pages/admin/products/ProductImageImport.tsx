import { EtsyListingPicker } from "./EtsyListingPicker";
import { useEffect, useRef, useState } from "react";
import { request, errorMessage } from "@/lib/adminApi";
import type { Product } from "@/types";
import type { ImageBatch } from "../research/ImageDownloads";
import { AdminButton, Field, TextArea, TextInput } from "../controls";
export interface ProductImageState {
  revision: string;
  images: string[];
  thumbnail: string;
  updatedAt: string;
}
const base = "/api/admin/research/images";
export function ProductImageImport({
  product,
  onAttached,
  onClose,
}: {
  product: Product;
  onAttached: (state: ProductImageState) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(""),
    [groups, setGroups] = useState<ImageBatch[]>([]),
    [groupId, setGroupId] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<ProductImageState>(),
    [evidence, setEvidence] = useState(""),
    [verified, setVerified] = useState(false),
    [permanent, setPermanent] = useState(false),
    [cover, setCover] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const [now] = useState(() => Date.now());
  const eligible = (g: ImageBatch) =>
    !g.revoked &&
    Date.parse(g.expiresAt) > now &&
    (!g.permissionUntil || Date.parse(g.permissionUntil) > now);
  const group = groups.find((g) => g.id === groupId);
  const mismatch =
    snapshot &&
    (JSON.stringify(snapshot.images) !== JSON.stringify(product.images) ||
      snapshot.thumbnail !== product.thumbnail);
  useEffect(() => {
    heading.current?.focus();
    let active = true;
    void Promise.all([
      request<ProductImageState>(
        "GET",
        `${base}/products/${encodeURIComponent(product.id)}/state`,
      ),
      request<ImageBatch[]>("GET", `${base}/batches`),
    ])
      .then(([state, batches]) => {
        if (active) {
          setSnapshot(state);
          setGroups(batches);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [product.id]);
  async function inspect() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request<{ available: boolean; message: string }>(
        "POST",
        `${base}/inspect`,
        { url },
      );
      const existing = groups.find(
        (g) => g.sourceUrl === url.trim() && eligible(g),
      );
      if (existing) {
        setGroupId(existing.id);
        setSelected([]);
        setMessage(
          "Bu bağlantı için kayıtlı özel galeri bulundu. Görselleri seçerek doğrudan bu ürüne ekleyebilirsiniz.",
        );
      } else setMessage(result.message);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function attach() {
    if (!snapshot) return;
    setBusy(true);
    setError("");
    try {
      const state = await request<ProductImageState>(
        "POST",
        `${base}/products/${encodeURIComponent(product.id)}/attach`,
        {
          imageIds: selected,
          expectedRevision: snapshot.revision,
          publicationEvidence: evidence,
          commercialPublicationVerified: verified,
          permanentPublicationConfirmed: permanent,
          makeCover: cover,
        },
      );
      setSnapshot(state);
      onAttached(state);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-4 rounded-lg border border-divider bg-paper-soft p-4"
      aria-label={`Ürüne görsel ekle: ${product.title}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 ref={heading} tabIndex={-1} className="text-lg">
          Görsel ekle: {product.title}
        </h3>
        <AdminButton variant="outline" disabled={busy} onClick={onClose}>
          Listeye dön
        </AdminButton>
      </div>
      <p className="text-sm">
        Seçtiğiniz görseller doğrudan bu ürünün galerisine kaydedilir. ZIP
        indirip yeniden yüklemeniz gerekmez. Diğer ürünler ve mevcut ürün
        bilgileri değiştirilmez.
      </p>
      <p className="text-sm">
        Etsy API erişimi yapılandırılmışsa bağlantıdan yeni görselleri getirebilir veya kayıtlı özel galeriyi kullanabilirsiniz.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void inspect();
        }}
      >
        <Field label="Bu ürünün Etsy bağlantısı">
          <TextInput
            required
            type="url"
            pattern="https://.*"
            maxLength={2048}
            value={url}
            disabled={busy}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <AdminButton disabled={busy}>
          Bağlantıyı kontrol et / kayıtlı galeriyi bul
        </AdminButton>
      </form>
      <EtsyListingPicker url={url} onBusy={setBusy} onImported={(batch) => {
        setGroups((prev) => [batch, ...prev.filter((g) => g.id !== batch.id)]);
        setGroupId(batch.id); setSelected(batch.images.map((image) => image.id));
        setUrl(batch.sourceUrl); setMessage("Yeni Etsy görselleri alındı. Yayın hakkını doğrulayıp aşağıdaki düğmeyle doğrudan ürüne kaydedin.");
      }} />
      <Field label="Mevcut özel galeriden seç">
        <select
          className="min-h-11 w-full rounded-md border border-divider bg-paper px-3"
          value={groupId}
          disabled={busy}
          onChange={(e) => {
            setGroupId(e.target.value);
            setSelected([]);
          }}
        >
          <option value="">Galeri seçin</option>
          {groups.filter(eligible).map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </Field>
      {group && (
        <>
          <p className="break-all text-xs">Kaynak: {group.sourceUrl}</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {group.images.map((image) => (
              <li
                key={image.id}
                className="min-w-0 rounded border border-line bg-paper p-3"
              >
                <a
                  href={`${base}/files/${image.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={`${base}/files/${image.id}`}
                    alt={image.fileName}
                    className="aspect-square w-full object-contain"
                  />
                </a>
                <label className="flex min-h-11 items-center gap-2 break-all text-sm">
                  <input
                    type="checkbox"
                    disabled={busy}
                    checked={selected.includes(image.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, image.id]
                          : selected.filter((id) => id !== image.id),
                      )
                    }
                  />
                  {image.productName}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      <Field
        label="Ticari yayın hakkının doğrulama kaydı"
        hint="Hak sahibi veya lisans belgesi referansı ve mağazada kullanım kapsamını yazın. Araştırma/indirme izni tek başına yeterli değildir."
      >
        <TextArea
          rows={3}
          minLength={10}
          maxLength={3000}
          value={evidence}
          disabled={busy}
          onChange={(e) => setEvidence(e.target.value)}
        />
      </Field>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={verified}
          disabled={busy}
          onChange={(e) => setVerified(e.target.checked)}
        />
        Seçilen görsellerin bu mağazada ticari yayın hakkını inceleyip
        doğruladım.
      </label>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={permanent}
          disabled={busy}
          onChange={(e) => setPermanent(e.target.checked)}
        />
        Bu kullanım hakkı süresizdir. Ürün görsellerinin herkese açık
        sunulacağını onaylıyorum.
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={cover}
          disabled={busy}
          onChange={(e) => setCover(e.target.checked)}
        />
        İlk seçilen görseli ürün kapağı yap
      </label>
      {mismatch && (
        <p role="alert" className="text-sm text-danger">
          Ürünün yerel görselleri sunucuyla eşleşmiyor. Önce değişiklikleri
          kaydedip sayfayı yenileyin. Kaydedilmemiş görsellerin üzerine
          yazılmadı.
        </p>
      )}
      <p className="text-xs">
        En fazla 12 ürün görseli. Yalnızca renk yer tutucuları varsa kaldırılır;
        mevcut yüklenmiş fotoğraflar korunur. Bu işlem görselleri hemen
        kaydeder; ürün yayındaysa sitede görünür. Özel galeri iznini iptal
        etmek, ürüne aktarılmış herkese açık kopyaları kaldırmaz.
      </p>
      <AdminButton
        disabled={
          busy ||
          !snapshot ||
          !!mismatch ||
          !selected.length ||
          selected.length > 12 ||
          !verified ||
          !permanent ||
          evidence.trim().length < 10
        }
        onClick={() => void attach()}
      >
        {busy
          ? "İşleniyor…"
          : `Seçilen ${selected.length} görseli bu ürüne kaydet`}
      </AdminButton>
    </section>
  );
}
