/** Default homepage copy — kept free of side effects so the API server can read it too. */
export const defaultAnnouncementMessages: string[] = [
  "Türkiye genelinde kargo — uygun ürünlerde ücretsiz",
  "Her parça CNC ile hassas şekilde kesilir, elle son işlemi yapılır",
  "Mekanınıza özel ölçü ve tasarım seçenekleri mevcut",
];

export const defaultHomeContent = {
  hero: {
    eyebrow: "Parametrik Tasarım Atölyesi",
    title: "Parametrik Sanat.\nMekanları Dönüştürür.",
    subtitle:
      "Algoritmik desenlerle CNC ve lazer kesim tekniğiyle üretilen duvar tabloları, mobilyalar ve dekoratif objeler.",
    primaryCtaLabel: "Ürünleri Keşfet",
    primaryCtaHref: "/parametrik-duvar-tablolari",
    secondaryCtaLabel: "Koleksiyonu İncele",
    secondaryCtaHref: "/katmanli-multilayer-tablolar",
    trustBadge: "500+ mutlu müşteri",
    /**
     * Real photos uploaded from the admin panel (`/admin` → Ana Sayfa →
     * Hero Görselleri). Empty = gradient placeholder. More than one turns
     * the hero into a draggable slideshow — see `sections/Hero.tsx`.
     */
    images: [] as string[],
  },

  categoryShowcase: {
    title: "Kategoriler",
    subtitle: "Beş ana koleksiyon, tek bir tasarım felsefesi.",
  },

  featuredProducts: {
    title: "Öne Çıkan Ürünler",
    subtitle: "Atölyemizin imza parçaları.",
    ctaLabel: "Tümünü Gör",
    ctaHref: "/parametrik-duvar-tablolari",
  },

  bestSellers: {
    title: "Çok Satanlar",
    subtitle: "Müşterilerimizin en çok tercih ettiği tasarımlar.",
  },

  newArrivals: {
    title: "Yeni Gelenler",
    subtitle: "Atölyeden yeni çıkan tasarımlar.",
  },

  partnerLogos: {
    title: "Türkiye'nin Önde Gelen Markaları Tarafından Tercih Ediliyor",
  },

  trustSignals: {
    title: "Neden Ahşap Kokusu",
  },

  testimonials: {
    title: "Müşterilerimiz Ne Diyor",
    subtitle: "500+ doğrulanmış yorum ve artıyor.",
  },

  parametricStory: {
    eyebrow: "Parametrik Tasarım Nedir?",
    title: "Algoritmalarla Şekillenen Sanat",
    body: "Parametrik tasarım, matematiksel kurallar ve değişkenlerle şekillenen bir üretim yaklaşımıdır. Her eser, belirlediğimiz parametrelere göre benzersiz bir geometri oluşturacak şekilde bilgisayar destekli olarak tasarlanır — sonra CNC ve lazer kesim teknolojisiyle ahşaba aktarılır. Sonuç: doğanın ve matematiğin buluştuğu, seri üretimde bulunmayan bir doku.",
    ctaLabel: "Süreci Keşfet",
    ctaHref: "/sayfa/hakkimizda",
  },

  blog: {
    title: "Atölyeden",
    subtitle: "Tasarım fikirleri, üretim süreci ve perde arkası hikayeler.",
    ctaLabel: "Blogu Ziyaret Et",
    ctaHref: "/blog",
  },

  materialCraft: {
    eyebrow: "Malzeme & Zanaat",
    title: "Ahşaptan Esere",
    body: "Her parça, seçilmiş MDF, kontrplak veya masif ahşap üzerine CNC ile işlenir, ardından elle zımparalanıp yüzey işlemi uygulanır. Katman sayısı, malzeme ve yüzey seçimleri her ürünün karakterini belirler — seri üretim değil, atölye işçiliğidir.",
  },

  customDesign: {
    eyebrow: "Özel Tasarım",
    title: "Mekanınıza Özel Tasarım",
    body: "Kendi fotoğrafınızdan bir portre, markanıza özel bir logo panosu ya da tamamen size özgü bir kompozisyon — parametrik tasarım süreciyle hayata geçirelim.",
    ctaLabel: "Özel Tasarım Talep Et",
    ctaHref: "/ozel-tasarim",
  },

  finalCta: {
    title: "Hayalinizdeki Tasarımı Birlikte Üretelim.",
    ctaLabel: "Bize Ulaşın",
    ctaHref: "/iletisim",
  },

  newsletter: {
    title: "Atölye Listemize Katılın",
    subtitle: "Yeni desenler, sınırlı üretim parçalar ve tasarım ilhamları — spam yok, istediğiniz zaman ayrılabilirsiniz.",
    placeholder: "E-posta adresiniz",
    ctaLabel: "Katıl",
    successMessage: "Listeye eklendiniz! Karşılama e-postamızı gelen kutunuzda kontrol edin.",
  },
};

export type HomeContent = typeof defaultHomeContent;
