import type { EstimateResult } from "./types";
import { duration } from "./format";
import { operationLabels } from "./defaults";
import type { Operation } from "./types";
export function QuoteSummary({
  result,
  quantity,
}: {
  result: EstimateResult;
  quantity: number;
}) {
  const t = result.time,
    c = result.cost;
  const money = (v: string) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: c.currency,
    }).format(Number(v));
  return (
    <aside
      className="laser-card space-y-5 xl:sticky xl:top-4"
      aria-label="Teklif özeti"
    >
      <div>
        <p className="text-xs uppercase tracking-widest text-body">
          Parti teklifi · {quantity} adet
        </p>
        <p className="mt-2 text-3xl font-semibold text-wood-deep">
          {money(c.incVat)}
        </p>
        <p className="text-sm text-body">
          KDV dahil · KDV hariç {money(c.exVat)}
        </p>
        <p className="text-sm text-body">
          Birim (KDV hariç): {money(c.unitExVat)}
        </p>
      </div>
      <div className="rounded-lg bg-warm p-3">
        <p className="font-semibold">
          {duration(t.totalS)} ·{" "}
          {t.classification === "simulated"
            ? "Simülasyon"
            : "Elle girilen süre"}
        </p>
        <p className="text-sm">
          Güven: {t.confidence === "low" ? "Düşük" : "Orta"}
        </p>
        <p className="mt-1 text-xs text-body">
          {t.confidenceReasons.join(" ")}
        </p>
      </div>
      <dl className="space-y-2 text-sm">
        {[
          ["Kesim", duration(t.cutS)],
          ["Vektör kazıma / skor", duration(t.vectorEngraveS)],
          ["Dolgu kazıma", duration(t.fillS)],
          ["Lazer kapalı hareket", duration(t.travelS)],
          ["İşlem gecikmeleri", duration(t.delaysS)],
          ["Teorik hız tabanı", duration(t.baselineS)],
          ["Maliyetlendirilen süre (pay dahil)", duration(t.quoteMachineS)],
          ["Hazırlık işçiliği", duration(t.setupS)],
          ["Elleçleme / bitirme", duration(t.handlingS)],
        ].map(([k, v]) => (
          <div className="flex justify-between gap-3" key={k}>
            <dt className="text-body">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <dl className="space-y-2 border-t border-line pt-4 text-sm">
        {[
          ["Malzeme", money(c.material)],
          ["Makine", money(c.machine)],
          ["İşçilik", money(c.labor)],
          ["Diğer giderler", money(c.other)],
          ["Parti maliyeti", money(c.batchCost)],
          ["Birim maliyeti", money(c.unitCost)],
          ["KDV", money(c.vat)],
          ["Etkin brüt marj", `%${c.effectiveMarginPercent}`],
        ].map(([k, v]) => (
          <div className="flex justify-between gap-3" key={k}>
            <dt className="text-body">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-body">
        {c.materialMode === "sheets" ? "Tam levha" : "Ayrılan alan"} maliyeti ·
        tahmini {c.sheets} levha · levhada {c.capacityPerSheet} adet. Ayrılan
        alan {(c.reservedAreaMm2 / 1e6).toFixed(4)} m², fire{" "}
        {(c.wasteAreaMm2 / 1e6).toFixed(4)} m².
      </p>
      <details className="text-sm">
        <summary className="cursor-pointer py-2">
          Hesap varsayımları ve oranlar
        </summary>
        <p className="my-2">Makine / dk: {money(c.machineMinuteRate)}</p>
        <dl>
          {Object.entries(c.rateBreakdown).map(([k, v]) => (
            <div key={k}>
              {
                (
                  {
                    depreciation: "Amortisman",
                    maintenance: "Bakım",
                    tube: "Tüp",
                    optics: "Optik",
                    electricity: "Elektrik",
                    overhead: "Sabit gider",
                    manual: "Manuel oran",
                  } as Record<string, string>
                )[k]
              }
              : {v}
            </div>
          ))}
        </dl>
        <ul className="mt-3 space-y-2">
          {[...t.warnings, ...c.warnings].map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <dl className="mt-3">
          {Object.entries(t.lengthByOperation).map(([op, length]) => (
            <div key={op}>
              {operationLabels[op as Operation]}: {length.toFixed(2)} mm / parti
            </div>
          ))}
        </dl>
        {t.scanLines > 0 && <p>Dolgu satırı: {t.scanLines}</p>}
        <p className="mt-2 text-xs">Hesap sürümü: {result.engineVersion}</p>
      </details>
      {result.reviewReasons.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-accent p-3 text-sm"
        >
          <p className="font-semibold">Yalnızca taslak</p>
          <ul className="mt-2 space-y-2">
            {result.reviewReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
