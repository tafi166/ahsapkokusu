import { applyOverride, loadOverrides } from "@/lib/adminStore";
import { localizeTestimonials } from "@/i18n/content";
import type { Testimonial } from "@/types";

/**
 * Placeholder testimonials — generic initials/roles, not real customer
 * names. Overridable from the admin panel (`/admin` → Listeler).
 */
const defaultTestimonials: Testimonial[] = [
  {
    id: "t1",
    authorInitial: "A. K.",
    rating: 5,
    role: "Ev Sahibi, İstanbul",
    quote: "Multilayer tablo salonumuzun odak noktası oldu. Kargo hızlıydı, paketleme kusursuzdu.",
  },
  {
    id: "t2",
    authorInitial: "M. Y.",
    rating: 5,
    role: "Anne, İzmir",
    quote: "Kızımızın isimli kapı süsü hastanede herkesin ilgisini çekti, şimdi odasının kapısında duruyor. Önizlemeyi onaylamadan üretime başlamamaları çok iyiydi.",
  },
  {
    id: "t3",
    authorInitial: "S. D.",
    rating: 4,
    role: "Kafe İşletmecisi",
    quote: "Kafemiz için logolu kapı tabelası ve iki duvar saati yaptırdık. Üretim süresi beklediğimden kısa sürdü.",
  },
  {
    id: "t4",
    authorInitial: "B. T.",
    rating: 5,
    role: "Ev Sahibi, Ankara",
    quote: "Kişiselleştirilmiş duvar saati hediye olarak sipariş ettim, çok beğenildi. Tekrar alışveriş yapacağım.",
  },
];

export const testimonials: Testimonial[] = localizeTestimonials(applyOverride(defaultTestimonials, loadOverrides().testimonials));
