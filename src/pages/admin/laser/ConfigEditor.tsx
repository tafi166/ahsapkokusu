import { useState } from "react";
import { AdminButton, Field, TextInput, Checkbox } from "../controls";
import { errorMessage } from "@/lib/adminApi";
import {
  blankMachine,
  blankMaterial,
  blankPreset,
  operationLabels,
} from "./defaults";
import { laserApi, type Configs } from "./api";
import type { Machine, Material, Preset } from "./types";
interface Definition {
  key: string;
  label: string;
  type?: "money" | "number" | "boolean" | "text";
  hint?: string;
  options?: string[];
}
const fields: Record<keyof Configs, Definition[]> = {
  machines: [
    { key: "name", label: "Makine adı" },
    { key: "manufacturer", label: "Üretici" },
    { key: "model", label: "Model" },
    {
      key: "powerW",
      label: "Optik lazer gücü (W)",
      type: "number",
      hint: "Bilinmiyorsa boş bırakın. Elektrik tüketimi değildir.",
    },
    { key: "controller", label: "Kontrolcü" },
    { key: "active", label: "Kullanımda", type: "boolean" },
    { key: "widthMm", label: "Çalışma genişliği (mm)", type: "number" },
    { key: "heightMm", label: "Çalışma yüksekliği (mm)", type: "number" },
    { key: "maxXSpeed", label: "X azami hız (mm/sn)", type: "number" },
    { key: "maxYSpeed", label: "Y azami hız (mm/sn)", type: "number" },
    { key: "cutAccelX", label: "X kesim ivmesi (mm/sn²)", type: "number" },
    { key: "cutAccelY", label: "Y kesim ivmesi (mm/sn²)", type: "number" },
    { key: "engraveAccelX", label: "X kazıma ivmesi (mm/sn²)", type: "number" },
    { key: "engraveAccelY", label: "Y kazıma ivmesi (mm/sn²)", type: "number" },
    {
      key: "cornerSpeed",
      label: "Köşe hız parametresi (mm/sn)",
      type: "number",
      hint: "0 = köşelerde tam duruş. Kontrolcü yaklaşımı; kalibrasyon gerekir.",
    },
    { key: "rapidSpeed", label: "Lazer kapalı hız (mm/sn)", type: "number" },
    { key: "startDelayS", label: "Başlangıç gecikmesi (sn)", type: "number" },
    {
      key: "operationDelayS",
      label: "İşlem geçiş gecikmesi (sn)",
      type: "number",
    },
    { key: "currency", label: "Para birimi", options: ["TRY", "USD"] },
    {
      key: "rateMode",
      label: "Makine maliyet yöntemi",
      options: ["derived", "manual"],
    },
    { key: "purchaseCost", label: "Satın alma bedeli", type: "money" },
    { key: "lifeYears", label: "Faydalı ömür (yıl)", type: "number" },
    { key: "annualMinutes", label: "Yıllık üretken süre (dk)", type: "number" },
    { key: "annualMaintenance", label: "Yıllık bakım rezervi", type: "money" },
    { key: "annualTubeReserve", label: "Yıllık tüp rezervi", type: "money" },
    {
      key: "annualOpticsReserve",
      label: "Yıllık optik rezervi",
      type: "money",
    },
    {
      key: "electricalKw",
      label: "Makine elektrik tüketimi (kW)",
      type: "number",
      hint: "Optik güçten türetilmez; ölçülen / belirtilen şebeke tüketimi.",
    },
    {
      key: "auxiliaryKw",
      label: "Aspirasyon / hava / soğutucu (kW)",
      type: "number",
    },
    {
      key: "electricityPerKwh",
      label: "Elektrik tarifesi / kWh",
      type: "money",
    },
    { key: "overheadPerMinute", label: "Sabit gider payı / dk", type: "money" },
    {
      key: "manualMinuteRate",
      label: "Manuel makine oranı / dk",
      type: "money",
    },
    {
      key: "manualIncludesLabor",
      label: "Manuel oran tüm işçilik dahil",
      type: "boolean",
      hint: "Etkinse teklifte ayrıca işçilik eklenmez.",
    },
  ],
  materials: [
    { key: "name", label: "Malzeme adı" },
    {
      key: "category",
      label: "Kategori",
      options: [
        "MDF",
        "Kontrplak",
        "Huş kontrplak",
        "Kavak kontrplak",
        "Masif ahşap",
        "Diğer doğrulanmış malzeme",
      ],
    },
    { key: "supplier", label: "Tedarikçi" },
    { key: "thicknessMm", label: "Kalınlık (mm)", type: "number" },
    { key: "sheetWidthMm", label: "Levha genişliği (mm)", type: "number" },
    { key: "sheetHeightMm", label: "Levha yüksekliği (mm)", type: "number" },
    { key: "sheetCost", label: "Levha alış bedeli (KDV hariç)", type: "money" },
    { key: "currency", label: "Para birimi", options: ["TRY", "USD"] },
    { key: "usablePercent", label: "Kullanılabilir alan (%)", type: "number" },
    { key: "wastePercent", label: "Ek fire (%)", type: "number" },
    { key: "kerfMm", label: "Kesim aralığı / kerf payı (mm)", type: "number" },
    { key: "available", label: "Kullanılabilir", type: "boolean" },
    {
      key: "compatibilityVerified",
      label: "CO₂ lazer uyumluluğu doğrulandı",
      type: "boolean",
      hint: "İçeriği bilinmeyen veya tehlikeli malzemeyi işlemeyin.",
    },
    { key: "notes", label: "Notlar" },
  ],
  presets: [
    { key: "name", label: "Reçete adı" },
    { key: "machineId", label: "Makine", options: [] },
    { key: "materialId", label: "Malzeme / kalınlık", options: [] },
    {
      key: "operation",
      label: "İşlem",
      options: ["cut", "score", "line", "fill"],
    },
    { key: "speed", label: "İşlem hızı (mm/sn)", type: "number" },
    { key: "powerPercent", label: "Güç (%)", type: "number" },
    { key: "passes", label: "Geçiş sayısı", type: "number" },
    {
      key: "lineIntervalMm",
      label: "Dolgu satır aralığı (mm)",
      type: "number",
      hint: "Yalnızca dolgu hesabında kullanılır; üretim için doğrulayın.",
    },
    { key: "overscanMm", label: "Her kenarda overscan (mm)", type: "number" },
    {
      key: "preparationDelayS",
      label: "İşlem hazırlık gecikmesi (sn)",
      type: "number",
    },
    {
      key: "coolingDelayS",
      label: "Yol/geçiş soğutma gecikmesi (sn)",
      type: "number",
    },
    {
      key: "tested",
      label: "Bu makine ve kalınlıkta test edildi",
      type: "boolean",
      hint: "Test edilmiş reçete, otomatik süre kalibrasyonu anlamına gelmez.",
    },
  ],
};
const labels: Record<string, string> = {
  derived: "Giderlerden hesapla",
  manual: "Manuel oran",
  ...operationLabels,
};
export function ConfigEditor({
  kind,
  configs,
  onSaved,
}: {
  kind: keyof Configs;
  configs: Configs;
  onSaved: () => Promise<void>;
}) {
  const blank =
    kind === "machines"
      ? blankMachine
      : kind === "materials"
        ? blankMaterial
        : blankPreset;
  const [editing, setEditing] = useState<
    { id: string; version: number } | undefined
  >();
  const [values, setValues] = useState<Record<string, unknown>>({ ...blank });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const title = {
    machines: "Makine profilleri",
    materials: "Malzeme kütüphanesi",
    presets: "Kesim reçeteleri",
  }[kind];
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-body">
          Gerçek üretim değerlerinizi girin. Değişiklikler sürümlenir; kayıtlı
          tekliflerin maliyetleri korunur.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <AdminButton
          variant="outline"
          onClick={() => {
            setEditing(undefined);
            setValues({ ...blank });
            setMessage("");
            setError("");
          }}
        >
          Yeni kayıt
        </AdminButton>
        {configs[kind].map((row) => (
          <AdminButton
            key={row.id}
            variant="outline"
            onClick={() => {
              setEditing(row);
              setValues({ ...row.data });
              setMessage("");
              setError("");
            }}
          >
            {row.data.name} · v{row.version}
          </AdminButton>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-success">
          {message}
        </p>
      )}
      <form
        className="laser-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            await laserApi.saveConfig(
              kind,
              values as unknown as Machine | Material | Preset,
              editing,
            );
            await onSaved();
            setEditing(undefined);
            setValues({ ...blank });
            setMessage("Kayıt kaydedildi.");
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
          {fields[kind].map((f) => {
            const value = values[f.key];
            const set = (v: unknown) =>
              setValues((old) => ({ ...old, [f.key]: v }));
            if (f.type === "boolean")
              return (
                <div key={f.key}>
                  <Checkbox
                    label={f.label}
                    checked={Boolean(value)}
                    onChange={set}
                  />
                  {f.hint && <p className="mt-1 text-xs text-body">{f.hint}</p>}
                </div>
              );
            let options = f.options?.map((v) => ({
              value: v,
              label: labels[v] ?? v,
            }));
            if (f.key === "machineId")
              options = configs.machines.map((m) => ({
                value: m.id,
                label: m.data.name,
              }));
            if (f.key === "materialId")
              options = configs.materials.map((m) => ({
                value: m.id,
                label: `${m.data.name} · ${m.data.thicknessMm} mm`,
              }));
            return (
              <Field key={f.key} label={f.label} hint={f.hint}>
                {options ? (
                  <select
                    aria-label={f.label}
                    className="laser-select"
                    value={String(value ?? "")}
                    required
                    onChange={(e) => set(e.target.value)}
                  >
                    <option value="">Seçin</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <TextInput
                    aria-label={f.label}
                    type={
                      f.type === "number" || f.type === "money"
                        ? "number"
                        : "text"
                    }
                    min={
                      f.type === "number" || f.type === "money" ? 0 : undefined
                    }
                    step={f.type === "money" ? "0.01" : "any"}
                    value={value === null ? "" : String(value ?? "")}
                    required={f.key === "name"}
                    onChange={(e) =>
                      set(
                        f.type === "number"
                          ? f.key === "powerW" && e.target.value === ""
                            ? null
                            : Number(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                )}
              </Field>
            );
          })}
          <AdminButton type="submit">
            {busy
              ? "Kaydediliyor…"
              : editing
                ? "Yeni sürümü kaydet"
                : "Kaydı oluştur"}
          </AdminButton>
        </fieldset>
      </form>
    </section>
  );
}
