import { applyOverride, loadOverrides } from "@/lib/adminStore";
import { localizeProductFaq } from "@/i18n/content";
import type { FaqItem } from "@/types";

/**
 * Generic product-page FAQ fallback, shown alongside any category-specific
 * FAQ. Overridable from the admin panel (`/admin` → Listeler).
 */
const defaultProductFaq: FaqItem[] = [
  {
    question: "Üretim süresi ne kadar?",
    answer:
      "Stoktaki ürünler 3–5 iş günü içinde kargoya verilir. Sipariş üzerine üretilen (made-to-order) ürünlerde süre 2–3 haftadır.",
  },
  {
    question: "Ölçüleri özelleştirebilir miyim?",
    answer:
      "Çoğu ürün için en fazla 50×70 cm olmak üzere özel ölçü mümkündür. En yakın hazır seçeneği seçip sipariş notuna istediğiniz ölçüyü yazabilirsiniz; onay için sizinle iletişime geçeriz.",
  },
  {
    question: "İade politikanız nedir?",
    answer:
      "Stoktan gönderilen ürünler orijinal ambalajında 30 gün içinde iade edilebilir. Sipariş üzerine üretilen/kişiselleştirilmiş ürünler üretime başlandıktan sonra iade edilemez.",
  },
  {
    question: "Türkiye dışına gönderim yapıyor musunuz?",
    answer: "Şu an için yurt içi gönderim yapıyoruz; yurt dışı gönderim taleplerinizi iletişim formundan iletebilirsiniz.",
  },
];

export const productFaq: FaqItem[] = localizeProductFaq(applyOverride(defaultProductFaq, loadOverrides().productFaq));
