import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AdminButton, Field, TextInput, TextArea } from "../controls";
import { errorMessage } from "@/lib/adminApi";
import { ConfigEditor } from "./ConfigEditor";
import { laserApi, type Configs } from "./api";
import { Workspace } from "./Workspace";
import { QuoteSummary } from "./QuoteSummary";
import { duration } from "./format";
import type { ProductionRun, Quote } from "./types";
import "./laser.css";
export function LaserStudio() {
  const path = useLocation().pathname;
  const navigate = useNavigate();
  const tab = path.split("/")[3] || "studio";
  const [configs, setConfigs] = useState<Configs>({
    machines: [],
    materials: [],
    presets: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(""),
    [quote, setQuote] = useState<Quote>(),
    [initial, setInitial] = useState<Quote>(),
    [workspaceKey, setWorkspaceKey] = useState(0);
  const [quotes, setQuotes] = useState<Omit<Quote, "snapshot">[]>([]),
    [runs, setRuns] = useState<ProductionRun[]>([]);
  async function refresh() {
    setConfigs(await laserApi.configs());
    setLoaded(true);
  }
  useEffect(() => {
    let active = true;
    laserApi
      .configs()
      .then((c) => {
        if (active) {
          setConfigs(c);
          setLoaded(true);
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
    if (tab === "quotes")
      laserApi
        .quotes()
        .then((r) => {
          if (active) setQuotes(r);
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    if (tab === "history")
      laserApi
        .runs()
        .then((r) => {
          if (active) setRuns(r);
        })
        .catch((e) => {
          if (active) setError(errorMessage(e));
        });
    return () => {
      active = false;
    };
  }, [tab, quote]);
  const tabs = [
    ["studio", "Hesaplama"],
    ["machines", "Makineler"],
    ["materials", "Malzemeler"],
    ["presets", "Reçeteler"],
    ["quotes", "Teklifler"],
    ["history", "Üretim geçmişi"],
  ];
  return (
    <div className="laser-studio space-y-6">
      <nav aria-label="Üretim araçları" className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            className={`rounded-full px-4 py-3 text-sm ${tab === id ? "bg-wood-deep text-white" : "bg-warm text-wood-deep"}`}
            to={`/admin/laser${id === "studio" ? "" : `/${id}`}`}
            aria-current={tab === id ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {!loaded ? (
        <div className="laser-card">
          <p role="status">Üretim kayıtları yükleniyor…</p>
          <AdminButton
            variant="outline"
            onClick={() => {
              setError("");
              void refresh().catch((e) => setError(errorMessage(e)));
            }}
          >
            Yeniden dene
          </AdminButton>
        </div>
      ) : ["machines", "materials", "presets"].includes(tab) ? (
        <ConfigEditor
          key={tab}
          kind={tab as keyof Configs}
          configs={configs}
          onSaved={refresh}
        />
      ) : tab === "quotes" ? (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold">Kayıtlı teklifler</h2>
          <p className="text-sm text-body">
            Son 100 kayıt. Kaydedilen fiyatlar ve girdiler değişmez. Düzenleme
            yeni bir sürüm oluşturur.
          </p>
          <div className="flex flex-wrap gap-2">
            {quotes.map((q) => (
              <AdminButton
                variant="outline"
                key={q.id}
                onClick={async () => {
                  setError("");
                  try {
                    setQuote(await laserApi.quote(q.id));
                  } catch (e) {
                    setError(errorMessage(e));
                  }
                }}
              >
                {q.name} ·{" "}
                {q.status === "DRAFT" ? "Taslak" : "Kesinleştirilmiş"} ·{" "}
                {new Date(q.createdAt).toLocaleDateString("tr-TR")}
              </AdminButton>
            ))}
          </div>
          {!quotes.length && <p>Henüz teklif kaydedilmedi.</p>}
          {quote && (
            <SavedQuote
              key={quote.id}
              quote={quote}
              onDuplicate={() => {
                setInitial(quote);
                setWorkspaceKey((k) => k + 1);
                navigate("/admin/laser");
              }}
            />
          )}
        </div>
      ) : tab === "history" ? (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold">
            Üretim ve kalibrasyon geçmişi
          </h2>
          <p className="text-sm text-body">
            Gerçek süre kayıtları değiştirilemez. Otomatik kalibrasyon bu
            sürümde kapalıdır; gözlemler fiyatları değiştirmez. Hata =
            (simülasyon − gerçek) / gerçek.
          </p>
          {!runs.length && (
            <p>Bir teklifi açarak ilk gerçek üretim süresini kaydedin.</p>
          )}
          {runs.map((r) => (
            <article key={r.id} className="laser-card text-sm">
              <Link className="underline" to="/admin/laser/quotes">
                Teklif {r.quoteId.slice(0, 8)}
              </Link>
              <p className="mt-2">
                {new Date(r.producedAt).toLocaleString("tr-TR")} · {r.quantity}{" "}
                adet
              </p>
              <p>
                Simülasyon {duration(r.estimatedS)} · Gerçek{" "}
                {duration(r.actualS)} · Mutlak hata {duration(r.absoluteErrorS)}{" "}
                · %{r.errorPercent?.toFixed(2)}
              </p>
              {r.previewS !== null && (
                <p>LightBurn Preview: {duration(r.previewS)}</p>
              )}
              <p>{r.notes}</p>
              <p>{r.quality}</p>
            </article>
          ))}
        </div>
      ) : (
        <Workspace
          key={workspaceKey}
          configs={configs}
          initial={initial}
          onSaved={(q) => {
            setQuote(q);
            navigate("/admin/laser/quotes");
          }}
        />
      )}
    </div>
  );
}
function SavedQuote({
  quote: q,
  onDuplicate,
}: {
  quote: Quote;
  onDuplicate: () => void;
}) {
  const [actual, setActual] = useState(""),
    [preview, setPreview] = useState(
      q.snapshot.input.lightburnPreviewS?.toString() ?? "",
    ),
    [notes, setNotes] = useState(""),
    [quality, setQuality] = useState("");
  const [when, setWhen] = useState(new Date().toISOString().slice(0, 16));
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <div className="space-y-5" key={q.id}>
      <div className="flex flex-wrap gap-3">
        <AdminButton onClick={onDuplicate}>
          Çoğalt / yeni sürüm düzenle
        </AdminButton>
        <AdminButton variant="outline" onClick={() => window.print()}>
          Teklifi yazdır / PDF
        </AdminButton>
      </div>
      <section className="laser-print space-y-4">
        <h3 className="text-xl font-semibold">Ahşap Kokusu · {q.name}</h3>
        <p className="text-sm">
          {q.status === "DRAFT"
            ? "TASLAK — üretim incelemesi gerekli"
            : "Tahmini üretim teklifi"}{" "}
          · {q.id.slice(0, 8)} ·{" "}
          {new Date(q.createdAt).toLocaleDateString("tr-TR")}
        </p>
        <p className="text-sm">
          {q.snapshot.machine.data.name} (v{q.snapshot.machine.version}) ·{" "}
          {q.snapshot.material.data.name} ·{" "}
          {q.snapshot.material.data.thicknessMm} mm (v
          {q.snapshot.material.version})
        </p>
        <QuoteSummary
          result={q.snapshot.result}
          quantity={q.snapshot.input.quantity}
        />
        <p className="text-xs text-body">
          Kayıt anındaki hesap özeti. Özel çizim dosyası bu belgeye eklenmez.
        </p>
      </section>
      <form
        className="laser-card space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          setError("");
          try {
            await laserApi.recordRun({
              quoteId: q.id,
              actualS: Number(actual),
              previewS: preview === "" ? null : Number(preview),
              quantity: q.snapshot.input.quantity,
              notes,
              quality,
              producedAt: new Date(`${when}Z`).toISOString(),
            });
            setMessage(
              "Gerçek üretim kaydı eklendi. Üretim geçmişinden karşılaştırabilirsiniz.",
            );
            setActual("");
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3 className="font-semibold">Gerçek üretim süresini kaydet</h3>
        <p className="text-sm text-body">
          Bu teklifin {q.snapshot.input.quantity} adetlik partisi için ölçülen
          makine süresi. İşçilik süresini dahil etmeyin. Kayıt değiştirilemez.
        </p>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          <Field label="Gerçek parti süresi (sn)">
            <TextInput
              type="number"
              min="0.01"
              step="any"
              required
              value={actual}
              onChange={(e) => setActual(e.target.value)}
            />
          </Field>
          <Field label="LightBurn Preview (sn)">
            <TextInput
              type="number"
              min="0"
              step="any"
              value={preview}
              onChange={(e) => setPreview(e.target.value)}
            />
          </Field>
          <Field label="Üretim tarihi (UTC)">
            <TextInput
              type="datetime-local"
              required
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </Field>
          <Field label="Operatör notları">
            <TextArea
              value={notes}
              maxLength={3000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <Field label="Kesim kalitesi gözlemleri">
            <TextArea
              value={quality}
              maxLength={3000}
              onChange={(e) => setQuality(e.target.value)}
            />
          </Field>
          <AdminButton type="submit">Gerçek süreyi kaydet</AdminButton>
        </fieldset>
        {message && (
          <p role="status" className="text-success">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
