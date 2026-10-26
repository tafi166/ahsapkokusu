import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminButton, Checkbox, Field, TextInput } from "../controls";
import { errorMessage } from "@/lib/adminApi";
import { laserApi, type Configs } from "./api";
import { blankEstimate, operationLabels } from "./defaults";
import { GeometryPreview } from "./GeometryPreview";
import { QuoteSummary } from "./QuoteSummary";
import type {
  Design,
  EstimateInput,
  EstimateResult,
  Operation,
  Quote,
} from "./types";
interface NumberField {
  key: keyof EstimateInput;
  label: string;
  money?: boolean;
  nullable?: boolean;
  hint?: string;
}
const costingFields: NumberField[] = [
  {
    key: "reservedWidthMm",
    label: "Ayrılan genişlik (mm)",
    hint: "0 = çizim genişliği; doğrulanmış nesting değildir.",
  },
  { key: "reservedHeightMm", label: "Ayrılan yükseklik (mm)" },
  { key: "setupMinutes", label: "Parti hazırlığı (dk)" },
  { key: "handlingMinutes", label: "Birim elleçleme (dk)" },
  { key: "finishingMinutes", label: "Birim bitirme işçiliği (dk)" },
  { key: "laborHourlyRate", label: "Saatlik işçilik", money: true },
  { key: "consumablesPerItem", label: "Birim sarf gideri", money: true },
  { key: "packagingPerItem", label: "Birim ambalaj", money: true },
  { key: "batchFixedCost", label: "Parti sabit gideri", money: true },
  { key: "targetPercent", label: "Hedef marj / maliyet üstü artış (%)" },
  { key: "minimumMarginPercent", label: "Asgari brüt marj (%)" },
  { key: "discountPercent", label: "Adet indirimi (%)" },
  { key: "minimumCharge", label: "Minimum sipariş tutarı", money: true },
  { key: "roundingStep", label: "Fiyat yuvarlama adımı", money: true },
  { key: "vatPercent", label: "KDV (%)" },
];
export function Workspace({
  configs,
  initial,
  onSaved,
}: {
  configs: Configs;
  initial?: Quote;
  onSaved: (q: Quote) => void;
}) {
  const [input, setInput] = useState<EstimateInput>(
    initial?.snapshot.input ?? blankEstimate,
  );
  const [design, setDesign] = useState<Design | undefined>(
    initial?.snapshot.design,
  );
  const [name, setName] = useState(
    initial ? `${initial.name} · yeni sürüm` : "",
  );
  const [result, setResult] = useState<EstimateResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [calculating, setCalculating] = useState(false),
    [scale, setScale] = useState("");
  const [recalculate, setRecalculate] = useState(0);
  const activePresets = configs.presets.filter(
    (p) =>
      p.data.machineId === input.machineId &&
      p.data.materialId === input.materialId,
  );
  const layers = design
    ? [...new Set(design.analysis.paths.map((p) => p.layer))]
    : [];
  const ready = Boolean(
    design &&
    input.machineId &&
    input.materialId &&
    layers.length &&
    layers.every(
      (layer) =>
        input.assignments[layer]?.operation === "ignore" ||
        input.assignments[layer]?.presetId,
    ),
  );
  useEffect(() => {
    let cancelled = false;
    if (!ready) return;
    const timer = setTimeout(() => {
      setCalculating(true);
      setError("");
      setResult(null);
      void laserApi
        .estimate(input)
        .then((r) => {
          if (!cancelled) {
            setResult(r);
            setError("");
          }
        })
        .catch((e) => {
          if (!cancelled) setError(errorMessage(e));
        })
        .finally(() => {
          if (!cancelled) setCalculating(false);
        });
    }, 650);
    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [input, ready, configs, recalculate]);
  function change<K extends keyof EstimateInput>(
    key: K,
    value: EstimateInput[K],
  ) {
    setResult(null);
    setCalculating(false);
    setInput((old) => ({ ...old, [key]: value }));
  }
  function setProfile(key: "machineId" | "materialId", value: string) {
    setResult(null);
    setCalculating(false);
    setInput((old) => ({
      ...old,
      [key]: value,
      assignments: Object.fromEntries(
        Object.entries(old.assignments).map(([k, v]) => [
          k,
          { operation: v.operation },
        ]),
      ),
    }));
  }
  function newDesign(next: Design) {
    setDesign(next);
    setResult(null);
    setInput((old) => ({
      ...old,
      designId: next.id,
      assignments: Object.fromEntries(
        [...new Set(next.analysis.paths.map((p) => p.layer))].map((layer) => [
          layer,
          { operation: "cut" as const },
        ]),
      ),
    }));
  }
  const numberField = (f: NumberField) => (
    <Field key={f.key} label={f.label} hint={f.hint}>
      <TextInput
        aria-label={f.label}
        type="number"
        min="0"
        step={f.money ? "0.01" : "any"}
        value={input[f.key] === null ? "" : String(input[f.key])}
        onChange={(e) =>
          change(
            f.key,
            (f.money
              ? e.target.value
              : f.nullable && e.target.value === ""
                ? null
                : Number(e.target.value)) as never,
          )
        }
      />
    </Field>
  );
  async function save(status: Quote["status"]) {
    setBusy(true);
    setError("");
    try {
      onSaved(await laserApi.save(name, input, status, initial?.id ?? null));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy} className="space-y-5 pb-24 xl:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-wood-deep">
            Üretim araçları · CO₂
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            LaserCut Pricing Studio
          </h2>
          <p className="mt-2 text-sm text-body">
            Çizimden ölçüme, üretim maliyetinden teklife.
          </p>
        </div>
        <span className="rounded-full bg-warm px-4 py-2 text-xs">
          LightBurn bağlantısı gerektirmez
        </span>
      </div>
      {initial && (
        <p className="rounded-lg bg-warm p-3 text-sm">
          Yeni sürüm güncel makine, malzeme ve reçete değerleriyle hesaplanır.
          Önceki teklif korunur.
        </p>
      )}
      {(!configs.machines.length ||
        !configs.materials.length ||
        !configs.presets.length) && (
        <div className="laser-card text-sm">
          <p>
            İlk teklif için makine, malzeme ve reçete oluşturun. Örnek üretim
            hızları veya tedarikçi fiyatları eklenmemiştir.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link className="underline" to="/admin/laser/machines">
              Makine ekle
            </Link>
            <Link className="underline" to="/admin/laser/materials">
              Malzeme ekle
            </Link>
            <Link className="underline" to="/admin/laser/presets">
              Reçete ekle
            </Link>
          </div>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-danger p-3 text-danger"
        >
          {error}
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[240px_minmax(0,1fr)_300px]">
        <fieldset
          disabled={busy}
          className="laser-card grid gap-4 sm:grid-cols-2 xl:col-span-2 2xl:col-span-1 2xl:grid-cols-1"
        >
          <Field
            label="SVG / DXF çizimi"
            hint="En fazla 512 KiB. UTF-8 SVG veya ASCII DXF."
          >
            <input
              className="w-full text-sm"
              type="file"
              accept=".svg,.dxf"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setError("");
                if (file.size > 524288) {
                  setError("Dosya 512 KiB sınırını aşıyor.");
                  return;
                }
                setBusy(true);
                try {
                  const text = new TextDecoder("utf-8", { fatal: true }).decode(
                    await file.arrayBuffer(),
                  );
                  const next = await laserApi.upload(
                    file.name,
                    text,
                    file.type,
                  );
                  newDesign(next);
                  setName((old) => old || file.name.replace(/\.[^.]+$/, ""));
                } catch (err) {
                  setError(errorMessage(err));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </Field>
          <Field label="Teklif adı">
            <TextInput
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Duvar dekoru · Ekim"
            />
          </Field>
          <Field label="Makine">
            <select
              aria-label="Makine"
              className="laser-select"
              value={input.machineId}
              onChange={(e) => setProfile("machineId", e.target.value)}
            >
              <option value="">Makine seçin</option>
              {configs.machines
                .filter((m) => m.data.active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.data.name} · v{m.version}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Malzeme / kalınlık">
            <select
              aria-label="Malzeme / kalınlık"
              className="laser-select"
              value={input.materialId}
              onChange={(e) => setProfile("materialId", e.target.value)}
            >
              <option value="">Malzeme seçin</option>
              {configs.materials
                .filter((m) => m.data.available)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.data.name} · {m.data.thicknessMm} mm · v{m.version}
                  </option>
                ))}
            </select>
          </Field>
          {numberField({ key: "quantity", label: "Üretim adedi" })}
          {numberField({
            key: "uncertaintyPercent",
            label: "Süre belirsizlik payı (%)",
            hint: "Yalnızca maliyetlendirilen makine süresine eklenir.",
          })}
        </fieldset>
        <div className="min-w-0 space-y-5">
          {design ? (
            <>
              <GeometryPreview
                key={design.id}
                geometry={design.analysis}
                assignments={input.assignments}
              />
              <div className="laser-card space-y-4">
                <p className="text-sm text-body">
                  {design.name} · Fiziksel ölçeği değiştirmek yeni bir özel
                  çizim kaydı oluşturur.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Doğrulanan mm / dosya birimi">
                    <TextInput
                      type="number"
                      min="0.000001"
                      step="any"
                      value={scale}
                      onChange={(e) => setScale(e.target.value)}
                      placeholder="Örn. mm çizimi için 1"
                    />
                  </Field>
                  <AdminButton
                    disabled={busy || !Number(scale) || Number(scale) < 0}
                    variant="outline"
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        newDesign(
                          await laserApi.scale(design.id, Number(scale)),
                        );
                      } catch (e) {
                        setError(errorMessage(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Ölçeği doğrula ve analiz et
                  </AdminButton>
                </div>
              </div>
              <div className="laser-card space-y-4">
                <h3 className="font-semibold">Katmanlar ve işlemler</h3>
                {layers.map((layer) => {
                  const assignment = input.assignments[layer] ?? {
                    operation: "cut" as const,
                  };
                  return (
                    <div
                      key={layer}
                      className="grid items-end gap-3 border-b border-line pb-4 sm:grid-cols-2"
                    >
                      <Field label={`${layer} · işlem`}>
                        <select
                          aria-label={`${layer} · işlem`}
                          className="laser-select"
                          value={assignment.operation}
                          onChange={(e) =>
                            change("assignments", {
                              ...input.assignments,
                              [layer]: {
                                operation: e.target.value as Operation,
                              },
                            })
                          }
                        >
                          {Object.entries(operationLabels).map(([v, label]) => (
                            <option key={v} value={v}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      {assignment.operation !== "ignore" && (
                        <Field label={`${layer} · reçete`}>
                          <select
                            aria-label={`${layer} · reçete`}
                            className="laser-select"
                            value={assignment.presetId ?? ""}
                            onChange={(e) =>
                              change("assignments", {
                                ...input.assignments,
                                [layer]: {
                                  ...assignment,
                                  presetId: e.target.value || undefined,
                                },
                              })
                            }
                          >
                            <option value="">Reçete seçin</option>
                            {activePresets
                              .filter(
                                (p) =>
                                  p.data.operation === assignment.operation,
                              )
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.data.name} · {p.data.speed} mm/sn ·{" "}
                                  {p.data.passes} geçiş
                                  {p.data.tested ? "" : " · doğrulanmadı"}
                                </option>
                              ))}
                          </select>
                        </Field>
                      )}
                    </div>
                  );
                })}
                <Checkbox
                  label="Test edilmemiş reçete / yaklaşık dolgu tahminini açıkça kabul ediyorum"
                  checked={input.acceptUnverified}
                  onChange={(v) => change("acceptUnverified", v)}
                />
              </div>
            </>
          ) : (
            <div className="laser-card flex min-h-[280px] flex-col items-center justify-center text-center">
              <p className="text-xl font-medium text-wood-deep">
                Çiziminizi ekleyin
              </p>
              <p className="mt-3 max-w-sm text-sm text-body">
                Yol uzunlukları, konturlar ve fiziksel ölçüler burada görünür.
                Desteklenmeyen geometri açıkça belirtilir.
              </p>
            </div>
          )}
          <details className="laser-card" open>
            <summary className="cursor-pointer font-semibold">
              Maliyet ve satış politikası
            </summary>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Malzeme maliyet yöntemi">
                <select
                  aria-label="Malzeme maliyet yöntemi"
                  className="laser-select"
                  value={input.materialMode}
                  onChange={(e) =>
                    change(
                      "materialMode",
                      e.target.value as EstimateInput["materialMode"],
                    )
                  }
                >
                  <option value="area">Ayrılan levha alanı</option>
                  <option value="sheets">Tam levha tahsisi</option>
                </select>
              </Field>
              <Field label="Fiyatlandırma yöntemi">
                <select
                  aria-label="Fiyatlandırma yöntemi"
                  className="laser-select"
                  value={input.pricingMode}
                  onChange={(e) =>
                    change(
                      "pricingMode",
                      e.target.value as EstimateInput["pricingMode"],
                    )
                  }
                >
                  <option value="margin">Brüt kâr marjı</option>
                  <option value="markup">Maliyet üstü artış</option>
                </select>
              </Field>
              {costingFields.map(numberField)}
            </div>
            <p className="mt-4 text-xs text-body">
              Tutarlar seçilen malzemenin para biriminde, KDV hariç girilir.
              Hazırlık partiye bir kez; elleçleme, bitirme, ambalaj ve sarf adet
              başına eklenir. KDV oranını işinize göre girin.
            </p>
          </details>
          <details className="laser-card">
            <summary className="cursor-pointer font-semibold">
              Hareket modeli ve LightBurn referansı
            </summary>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Yol sıralama">
                <select
                  aria-label="Yol sıralama"
                  className="laser-select"
                  value={input.ordering}
                  onChange={(e) =>
                    change(
                      "ordering",
                      e.target.value as EstimateInput["ordering"],
                    )
                  }
                >
                  <option value="document">Belge sırası</option>
                  <option value="inner">İç konturlar önce</option>
                  <option value="nearest">Yakın yol başlangıcı</option>
                </select>
              </Field>
              <Field label="İşlem sırası">
                <select
                  aria-label="İşlem sırası"
                  className="laser-select"
                  value={input.operationOrder.join(",")}
                  onChange={(e) =>
                    change(
                      "operationOrder",
                      e.target.value.split(
                        ",",
                      ) as EstimateInput["operationOrder"],
                    )
                  }
                >
                  <option value="cut,score,line,fill">
                    Kesim → skor → çizgi → dolgu
                  </option>
                  <option value="fill,line,score,cut">
                    Dolgu → çizgi → skor → kesim
                  </option>
                </select>
              </Field>
              {numberField({
                key: "lightburnPreviewS",
                label: "LightBurn Preview parti süresi (sn)",
                nullable: true,
                hint: "İsteğe bağlı karşılaştırma; hesap süresinin yerine geçmez.",
              })}
              {numberField({
                key: "manualMachineS",
                label: "Manuel toplam parti makine süresi (sn)",
                nullable: true,
                hint: "Boşsa simülasyon kullanılır. Girilirse maliyet bu süreyi kullanır; alt kalemler simülasyon olarak kalır.",
              })}
            </div>
            <p className="mt-4 text-xs text-body">
              LightBurn yerel bağlantısı kapalıdır. Hareket ve köşe modeli
              yaklaşık; gerçek çalışma süresi değildir. Dosya başlangıcı çalışma
              alanı başlangıcına taşınmış kabul edilir.
            </p>
          </details>
        </div>
        <div id="laser-summary" className="space-y-4 xl:sticky xl:top-4">
          {result ? (
            <QuoteSummary result={result} quantity={input.quantity} />
          ) : (
            <div className="laser-card" role="status">
              {calculating
                ? "Sunucuda hesaplanıyor…"
                : ready
                  ? "Hesap için girdileri kontrol edin."
                  : "Çizim, makine, malzeme ve her katman için reçete seçin."}
            </div>
          )}
          <div className="laser-card space-y-3">
            <AdminButton
              className="w-full"
              variant="outline"
              disabled={!ready || busy || calculating}
              onClick={() => {
                setResult(null);
                setRecalculate((n) => n + 1);
              }}
            >
              Yeniden hesapla
            </AdminButton>
            <AdminButton
              className="w-full"
              disabled={!result || busy || calculating || !name.trim()}
              onClick={() => void save("DRAFT")}
            >
              Taslağı kaydet
            </AdminButton>
            <AdminButton
              className="w-full"
              variant="outline"
              disabled={
                !result?.canFinalize || busy || calculating || !name.trim()
              }
              onClick={() => void save("FINAL")}
            >
              Teklifi kesinleştir
            </AdminButton>
            <p className="text-xs text-body">
              Kesinleştirme de tahmindir; üretimde ölçülmüş süre anlamına
              gelmez.
            </p>
          </div>
        </div>
      </div>
      {result && (
        <a
          href="#laser-summary"
          className="fixed inset-x-4 bottom-3 z-30 flex items-center justify-between gap-3 rounded-xl bg-wood-deep px-5 py-4 text-white shadow-lg xl:hidden"
        >
          <span className="text-sm">
            {input.quantity} adet ·{" "}
            {result.canFinalize ? "Tahmini teklif" : "Taslak"}
            <br />
            Özeti aç ↑
          </span>
          <strong>
            {new Intl.NumberFormat("tr-TR", {
              style: "currency",
              currency: result.cost.currency,
            }).format(Number(result.cost.incVat))}
            <span className="block text-right text-xs font-normal">
              KDV dahil
            </span>
          </strong>
        </a>
      )}
    </fieldset>
  );
}
