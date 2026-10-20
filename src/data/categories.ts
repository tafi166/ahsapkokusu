import { applyOverride, loadOverrides } from "@/lib/adminStore";
import type { Category } from "@/types";

/**
 * The 5 top-level categories. Each `slug` is also the SEO-friendly route
 * segment (e.g. `/parametrik-duvar-tablolari`). `facets` declares which
 * filters CategoryPage should render for that category — see
 * components/collection/FilterDrawer.tsx, which reads this config instead
 * of hardcoding filters per page.
 *
 * Overridable (text/FAQ/hero color only, not add/remove) from the admin
 * panel (`/admin` → Kategoriler) — see `lib/adminStore.ts`.
 */
const defaultCategories: Category[] = [
  {
    slug: "parametrik-duvar-tablolari",
    title: "Parametrik Duvar Tabloları",
    shortDescription: "Algoritmik desenlerle CNC/lazer kesim duvar sanatı.",
    description:
      "Parametrik tasarım yazılımlarıyla üretilen, geometrik ve organik desenlere sahip duvar tabloları. Her tasarım, ahşap üzerinde ışık ve gölgeyle canlanan bir doku oluşturacak şekilde optimize edilir.",
    heroSwatch: "#2b2b2b",
    subcategories: [
      { slug: "portre-ve-figur", title: "Portre & Figür" },
      { slug: "hayvan-figurleri", title: "Hayvan Figürleri" },
      { slug: "arac-ve-motor", title: "Araç & Motor Sporları" },
      { slug: "soyut-ve-geometrik", title: "Soyut & Geometrik" },
      { slug: "ozel-tasarimlar", title: "Özel Tasarımlar" },
    ],
    facets: { price: true, material: true, color: true, subcategory: true, availability: true },
    seoTitle: "Parametrik Duvar Tabloları | Modern CNC Ahşap Sanat",
    seoDescription:
      "Algoritmik desenli, CNC ve lazer kesim parametrik duvar tabloları. Portre, hayvan, araç ve soyut tasarımlar — mekanınıza özel ölçü ve malzeme seçenekleriyle.",
    faq: [
      {
        question: "Tablolar hangi malzemeden üretiliyor?",
        answer: "MDF, kontrplak ve masif ahşap seçenekleriyle üretim yapıyoruz; her ürün sayfasında malzeme seçenekleri belirtilir.",
      },
      {
        question: "Özel bir görsel üzerinden tablo yaptırabilir miyim?",
        answer: "Evet — Özel Tasarımlar alt kategorisi ve iletişim formundan kendi fotoğraf/desen talebinizi iletebilirsiniz.",
      },
    ],
  },
  {
    slug: "katmanli-multilayer-tablolar",
    title: "Katmanlı Multilayer Tablolar",
    shortDescription: "Derinlik hissi veren çok katmanlı ahşap kompozisyonlar.",
    description:
      "Birden fazla ahşap katmanının farklı derinliklerde konumlandırılmasıyla oluşan, 3 ila 11 katman arasında seçilebilen multilayer tablolar. Işık geçirgenliği ve gölge oyunuyla klasik duvar tablolarından ayrışır.",
    heroSwatch: "#3c3c3c",
    subcategories: [
      { slug: "3-katman", title: "3 Katman" },
      { slug: "5-katman", title: "5 Katman" },
      { slug: "7-katman", title: "7 Katman" },
      { slug: "9-katman", title: "9 Katman" },
      { slug: "11-katman", title: "11 Katman" },
    ],
    facets: { price: true, layerCount: true, material: true, color: true, availability: true },
    seoTitle: "Katmanlı Multilayer Tablolar | Çok Katmanlı Ahşap Duvar Sanatı",
    seoDescription:
      "3, 5, 7, 9 ve 11 katmanlı multilayer ahşap tablolar. Derinlik hissi veren tasarımlar, çerçeve ve montaj seçenekleriyle.",
    faq: [
      {
        question: "Katman sayısı fiyatı nasıl etkiler?",
        answer: "Katman sayısı arttıkça işçilik ve malzeme miktarı arttığı için fiyat da artar — her ürün sayfasında katman seçeneğine göre fiyat güncellenir.",
      },
      {
        question: "Çerçeve dahil mi?",
        answer: "Çerçeve seçimi ürün sayfasında ayrı bir seçenek olarak sunulur; çerçevesiz veya ahşap/metal çerçeveli sipariş edebilirsiniz.",
      },
    ],
  },
  {
    slug: "parametrik-mobilyalar",
    title: "Parametrik Mobilyalar",
    shortDescription: "Fonksiyon ve heykelsi formu birleştiren CNC mobilyalar.",
    description:
      "Sandalyeden resepsiyon masasına, parametrik algoritmalarla tasarlanmış, yapısal olarak optimize edilmiş mobilyalar. Konut ve ticari projeler için üretime uygun.",
    heroSwatch: "#6b5847",
    subcategories: [
      { slug: "sandalye-ve-tabure", title: "Sandalye & Tabure" },
      { slug: "sehpa-ve-masa", title: "Sehpa & Masa" },
      { slug: "raf-ve-tv-unitesi", title: "Raf & TV Ünitesi" },
      { slug: "resepsiyon-ve-ofis", title: "Resepsiyon & Ofis" },
      { slug: "bench-ve-oturma", title: "Bench & Oturma Grupları" },
    ],
    facets: { price: true, subcategory: true, material: true, color: true, availability: true },
    seoTitle: "Parametrik Mobilyalar | Tasarım Odaklı CNC Mobilya",
    seoDescription:
      "Sandalye, sehpa, TV ünitesi ve resepsiyon masası dahil parametrik tasarım mobilyalar. Malzeme, ölçü ve renk seçenekleriyle özelleştirilebilir.",
    faq: [
      {
        question: "Mobilyalar kurulum gerektiriyor mu?",
        answer: "Çoğu parça basit bir montaj gerektirir; her ürün sayfasında montaj süresi ve zorluk seviyesi belirtilir.",
      },
    ],
  },
  {
    slug: "duvar-saatleri",
    title: "Duvar Saatleri",
    shortDescription: "Parametrik desenli, sessiz mekanizmalı duvar saatleri.",
    description:
      "Geometrik ve organik desenli, farklı çap ve malzeme seçenekleriyle üretilen duvar saatleri. Sessiz akrep-yelkovan mekanizması ile her mekana uyum sağlar.",
    heroSwatch: "#5c4632",
    subcategories: [
      { slug: "geometrik-desenler", title: "Geometrik Desenler" },
      { slug: "minimal-saatler", title: "Minimal Saatler" },
      { slug: "buyuk-boy-saatler", title: "Büyük Boy Saatler" },
    ],
    facets: { price: true, material: true, color: true, subcategory: true, availability: true },
    seoTitle: "Parametrik Duvar Saatleri | Tasarım Saat Koleksiyonu",
    seoDescription: "Farklı çap ve malzeme seçenekleriyle parametrik desenli duvar saatleri. Sessiz mekanizma, kişiselleştirme seçenekleri.",
    faq: [
      {
        question: "Saat mekanizması sessiz mi?",
        answer: "Evet, tüm saatlerde sessiz (sweep) mekanizma kullanılır.",
      },
      {
        question: "Üzerine isim/tarih yazdırabilir miyim?",
        answer: "Kişiselleştirme seçeneği olan modellerde ürün sayfasından metin ekleyebilirsiniz.",
      },
    ],
  },
  {
    slug: "dekorlar",
    title: "Dekorlar",
    shortDescription: "Heykelsi objeler ve küçük ölçekli parametrik dekorasyon.",
    description:
      "Ana kategorilere girmeyen, heykelsi ve dekoratif parametrik objeler. Raf üstü objelerden aydınlatma aksesuarlarına kadar geniş bir yelpaze.",
    heroSwatch: "#8a6a4b",
    subcategories: [
      { slug: "heykeller", title: "Heykeller" },
      { slug: "kucuk-obje", title: "Küçük Objeler" },
      { slug: "aydinlatma-aksesuari", title: "Aydınlatma Aksesuarları" },
      { slug: "dekoratif-panel", title: "Dekoratif Paneller" },
    ],
    facets: { price: true, material: true, color: true, subcategory: true, availability: true },
    seoTitle: "Parametrik Dekor Objeleri | Tasarım Aksesuarları",
    seoDescription: "Heykelsi objeler, küçük dekorlar ve aydınlatma aksesuarları — parametrik tasarım anlayışıyla üretilir.",
    faq: [
      {
        question: "Dekor ürünleri hediye paketinde gönderiliyor mu?",
        answer: "Talep üzerine hediye paketleme seçeneği sunuyoruz, sepette not olarak belirtebilirsiniz.",
      },
    ],
  },
];

export const categories: Category[] = applyOverride(defaultCategories, loadOverrides().categories);

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}
