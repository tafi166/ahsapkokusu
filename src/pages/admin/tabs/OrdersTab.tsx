import { useEffect, useState } from "react";
import { adminApi, errorMessage, type OrderStatus, type StaffOrder } from "@/lib/adminApi";
import { describeOptions, formatPrice } from "@/lib/price";

const STATUS_LABEL: Record<OrderStatus, string> = {
  RECEIVED: "Alındı",
  PROCESSING: "Hazırlanıyor",
  SHIPPED: "Kargolandı",
  CANCELLED: "İptal",
};

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });

/** Orders placed through the storefront checkout — all test orders until payments exist. */
export function OrdersTab() {
  const [orders, setOrders] = useState<StaffOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listOrders()
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function changeStatus(id: string, status: OrderStatus) {
    setError(null);
    try {
      const updated = await adminApi.setOrderStatus(id, status);
      setOrders((prev) => prev?.map((o) => (o.id === id ? updated : o)) ?? null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Siparişler</h2>
        <p className="text-sm text-black/55">
          Ödeme entegrasyonu yokken verilen tüm siparişler test siparişidir: ödeme alınmadı, gönderim yapılmamalı.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {orders === null && !error ? <p className="text-sm text-black/50">Yükleniyor…</p> : null}
      {orders?.length === 0 ? <p className="text-sm text-black/50">Henüz sipariş yok.</p> : null}
      <ul className="space-y-3">
        {orders?.map((o) => (
          <li key={o.id} className="rounded-lg border border-black/10 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {o.number}{" "}
                  {o.isTest ? (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-amber-900">Test</span>
                  ) : null}
                </p>
                <p className="text-xs text-black/50">{dateFormat.format(new Date(o.createdAt))}</p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                Durum
                <select
                  value={o.status}
                  aria-label={`${o.number} durumu`}
                  onChange={(e) => void changeStatus(o.id, e.target.value as OrderStatus)}
                  className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
                >
                  {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-2">
              {o.customer.name} · <a href={`mailto:${o.customer.email}`} className="underline">{o.customer.email}</a> · {o.customer.phone}
            </p>
            {o.address ? (
              <p className="text-black/70">
                {o.address.line}, {o.address.district} / {o.address.city} {o.address.postalCode ?? ""}
              </p>
            ) : (
              <p className="text-black/50">Yalnızca dijital ürün — adres yok.</p>
            )}
            <ul className="mt-2 divide-y divide-black/5">
              {o.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-4 py-1.5">
                  <span>
                    {l.title} × {l.quantity}
                    {describeOptions(l.options).length > 0 ? (
                      <span className="block text-xs text-black/50">{describeOptions(l.options).join(" · ")}</span>
                    ) : null}
                  </span>
                  <span>{formatPrice(l.lineTotal, o.currency)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-right font-medium">Ara toplam: {formatPrice(o.subtotal, o.currency)}</p>
            {o.notes ? <p className="mt-2 whitespace-pre-line rounded-md bg-black/[0.03] p-2 text-black/70">{o.notes}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
