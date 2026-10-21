import { applyOverride, loadOverrides } from "@/lib/adminStore";
import { localizeTrustSignals } from "@/i18n/content";
import type { TrustSignal } from "@/types";

/** Overridable from the admin panel (`/admin` → Listeler). */
const defaultTrustSignals: TrustSignal[] = [
  {
    id: "ts1",
    icon: "craft",
    title: "Atölye İşçiliği",
    description: "Her parça sipariş üzerine CNC ile kesilir, elle son işlemi yapılır — seri üretim değildir.",
  },
  {
    id: "ts2",
    icon: "shipping",
    title: "Ücretsiz Kargo",
    description: "Uygun ürünlerde Türkiye geneli ücretsiz gönderim.",
  },
  {
    id: "ts3",
    icon: "payments",
    title: "Esnek Ödeme",
    description: "Tek çekim veya taksitli ödeme seçenekleriyle ödeyin.",
  },
  {
    id: "ts4",
    icon: "reviews",
    title: "Müşteri Memnuniyeti",
    description: "Yüzlerce doğrulanmış beş yıldızlı yorum.",
  },
];

export const trustSignals: TrustSignal[] = localizeTrustSignals(applyOverride(defaultTrustSignals, loadOverrides().trustSignals));

/** Generic partner wordmarks for the homepage logo strip — plain text, not real brand marks. */
const defaultPartnerLogos: string[] = [
  "STÜDYO GRİD",
  "ATÖLYE & CO",
  "FORM & KATMAN",
  "MERİDYEN İÇ MİMARİ",
  "NORTHWOOD",
  "CEDARLINE",
];

export const partnerLogos: string[] = applyOverride(defaultPartnerLogos, loadOverrides().partnerLogos);
