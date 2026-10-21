import { useEffect, useState } from "react";
import { adminApi, errorMessage, type QuoteRequest, type QuoteStatus } from "@/lib/adminApi";
import { formatBytes } from "@/lib/cncQuote";
import { AdminButton } from "@/pages/admin/controls";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  NEW: "Yeni",
  REVIEWING: "İnceleniyor",
  QUOTED: "Teklif verildi",
  CLOSED: "Kapandı",
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

/** CNC quote requests sent from the storefront's "Dosya yükle" form. */
export function QuotesTab() {
  const [quotes, setQuotes] = useState<QuoteRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setQuotes(await adminApi.listQuotes());
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listQuotes()
      .then((list) => {
        if (!cancelled) setQuotes(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function changeStatus(id: string, status: QuoteStatus) {
    setError(null);
    try {
      const updated = await adminApi.setQuoteStatus(id, status);
      setQuotes((prev) => prev?.map((q) => (q.id === id ? updated : q)) ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Teklif Talepleri</h2>
          <p className="text-sm text-black/55">Müşterilerin yüklediği SVG dosyaları için gelen kesim teklifi talepleri.</p>
        </div>
        <AdminButton variant="outline" onClick={() => void load()}>
          Yenile
        </AdminButton>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {quotes === null && !error ? <p className="text-sm text-black/50">Yükleniyor…</p> : null}
      {quotes?.length === 0 ? <p className="text-sm text-black/50">Henüz teklif talebi yok.</p> : null}

      <ul className="space-y-3">
        {quotes?.map((q) => (
          <li key={q.id} className="rounded-lg border border-black/10 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{q.reference}</p>
                <p className="text-xs text-black/50">{dateFormat.format(new Date(q.createdAt))}</p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                Durum
                <select
                  value={q.status}
                  onChange={(e) => void changeStatus(q.id, e.target.value as QuoteStatus)}
                  aria-label={`${q.reference} durumu`}
                  className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                >
                  {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <div>
                <dt className="inline text-black/50">İletişim: </dt>
                <dd className="inline">
                  {q.contactName} · <a href={`mailto:${q.contactEmail}`} className="underline">{q.contactEmail}</a>
                  {q.contactPhone ? ` · ${q.contactPhone}` : ""}
                </dd>
              </div>
              <div>
                <dt className="inline text-black/50">Talep: </dt>
                <dd className="inline">
                  {q.widthCm.toLocaleString("tr-TR")} × {q.heightCm.toLocaleString("tr-TR")} cm · {q.material} · {q.quantity} adet
                </dd>
              </div>
              <div>
                <dt className="inline text-black/50">Dosya: </dt>
                <dd className="inline break-all">
                  {q.fileName} ({formatBytes(q.fileSize)}) ·{" "}
                  <a href={adminApi.quoteFileUrl(q.id)} className="underline" download>
                    İndir
                  </a>
                </dd>
              </div>
            </dl>
            {q.notes ? <p className="mt-2 whitespace-pre-line rounded-md bg-black/[0.03] p-2 text-black/70">{q.notes}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
