-- Narrows the range to shippable sizes (at most 50×70 cm): six categories replace the
-- previous five. Wall art and multilayer art merge into duvar-tablolari, furniture becomes
-- the small-furniture subcategory of dekor-objeleri, lighting gets its own category, and
-- bebek-cocuk-odasi and kisiye-ozel-hediyelik are new. Existing products are moved, never
-- deleted; uploaded category banners are kept. An empty database (fresh install, test
-- database) is left alone: the seed creates the new categories there.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Category") THEN
    RETURN;
  END IF;

  INSERT INTO "Category" ("slug", "title", "sortOrder", "content", "isSample", "updatedAt")
    VALUES
      ('duvar-tablolari', 'Duvar Tabloları', 0, '{"shortDescription":"En fazla 50×70 cm parametrik ve katmanlı ahşap tablolar.","description":"Parametrik tasarım yazılımlarıyla üretilen geometrik ve organik desenli tablolar ile derinlik hissi veren katmanlı (multilayer) kompozisyonlar. Tüm tablolar en fazla 50×70 cm ölçüsünde üretilir; güvenli paketlenir ve kargoya uygundur.","heroSwatch":"#2b2b2b","subcategories":[{"slug":"soyut-ve-geometrik","title":"Soyut & Geometrik"},{"slug":"hayvan-figurleri","title":"Hayvan Figürleri"},{"slug":"portre-ve-figur","title":"Portre & Figür"},{"slug":"arac-ve-motor","title":"Araç & Motor Sporları"},{"slug":"katmanli-tablolar","title":"Katmanlı (Multilayer) Tablolar"}],"facets":{"price":true,"subcategory":true,"layerCount":true,"material":true,"color":true,"availability":true},"seoTitle":"Parametrik ve Katmanlı Duvar Tabloları | CNC Ahşap Sanat","seoDescription":"En fazla 50×70 cm parametrik ve katmanlı ahşap duvar tabloları. Soyut, hayvan, portre ve multilayer tasarımlar — CNC ve lazer kesimle üretilir, güvenli kargolanır.","faq":[{"question":"Tablolar hangi malzemeden üretiliyor?","answer":"MDF, kontrplak ve masif ahşap seçenekleriyle üretim yapıyoruz; her ürün sayfasında malzeme seçenekleri belirtilir."},{"question":"Neden en fazla 50×70 cm?","answer":"Parametrik tablolar ince ahşap parçalardan oluşur. Bu ölçü sınırı, her parçayı standart kolilerde güvenle paketleyip hasarsız ulaştırmamızı sağlar."},{"question":"Katman sayısı fiyatı nasıl etkiler?","answer":"Katman sayısı arttıkça işçilik ve malzeme miktarı arttığı için fiyat da artar — ürün sayfasında katman seçeneğine göre fiyat güncellenir."}]}'::jsonb, true, now()),
      ('duvar-saatleri', 'Duvar Saatleri', 1, '{"shortDescription":"Parametrik desenli, sessiz mekanizmalı duvar saatleri.","description":"Geometrik ve organik desenli, 25 ila 50 cm çap seçenekleriyle üretilen duvar saatleri. Sessiz akrep-yelkovan mekanizması ile her mekana uyum sağlar.","heroSwatch":"#5c4632","subcategories":[{"slug":"geometrik-desenler","title":"Geometrik Desenler"},{"slug":"minimal-saatler","title":"Minimal Saatler"},{"slug":"kisiye-ozel-saatler","title":"Kişiye Özel Saatler"}],"facets":{"price":true,"material":true,"color":true,"subcategory":true,"availability":true},"seoTitle":"Parametrik Duvar Saatleri | Tasarım Saat Koleksiyonu","seoDescription":"25–50 cm çap seçenekleriyle parametrik desenli ahşap duvar saatleri. Sessiz mekanizma, isim ve tarih kişiselleştirme.","faq":[{"question":"Saat mekanizması sessiz mi?","answer":"Evet, tüm saatlerde sessiz (sweep) mekanizma kullanılır."},{"question":"Üzerine isim/tarih yazdırabilir miyim?","answer":"Kişiye Özel Saatler alt kategorisindeki modellerde istediğiniz metni sipariş notunda ya da \"Bu Ürünü Sor\" formunda iletebilirsiniz."}]}'::jsonb, true, now()),
      ('bebek-cocuk-odasi', 'Bebek & Çocuk Odası', 2, '{"shortDescription":"İsimli bebek kapı süsleri, isim panoları ve doğum hatıraları.","description":"Bebeğinizin adıyla kişiselleştirilen kapı süsleri, katmanlı isim panoları, doğum bilgilerini taşıyan hatıra panoları ve çocuk odası dekorları. Hastane kapısından çocuk odası duvarına, ilk günleri saklayan ahşap parçalar.","heroSwatch":"#a3876a","subcategories":[{"slug":"kapi-susleri","title":"Bebek Kapı Süsleri"},{"slug":"isim-panolari","title":"İsim Panoları"},{"slug":"dogum-hatirasi","title":"Doğum Hatırası"},{"slug":"cocuk-odasi-dekoru","title":"Çocuk Odası Dekoru"}],"facets":{"price":true,"subcategory":true,"color":true,"availability":true},"seoTitle":"Bebek Kapı Süsü ve Çocuk Odası Dekoru | İsimli Ahşap Tasarımlar","seoDescription":"İsimli bebek kapı süsleri, doğum hatırası panoları ve çocuk odası dekorları. Ahşaptan, kişiye özel olarak lazer kesimle üretilir.","faq":[{"question":"İsim ve renk seçimini nasıl yapıyorum?","answer":"Siparişinizde ya da ürün sayfasındaki \"Bu Ürünü Sor\" formunda bebeğinizin adını ve renk tercihinizi yazın; üretime başlamadan önce tasarım önizlemesini onayınıza sunarız."},{"question":"Kapı süsü doğuma ne kadar sürede yetişir?","answer":"Önizleme onayından sonra üretim genellikle 3–5 iş günü sürer. Doğum tarihine yakın siparişlerde bize yazın, planlamayı birlikte yapalım."},{"question":"Bebeğin ulaşabileceği yere asılabilir mi?","answer":"Hayır. Ürünler küçük parçalar içerebilen dekoratif objelerdir, oyuncak değildir; çocukların ulaşamayacağı yükseklikte asılmalıdır."}]}'::jsonb, true, now()),
      ('kisiye-ozel-hediyelik', 'Kişiye Özel & Hediyelik', 3, '{"shortDescription":"Kapı isimlikleri, anı plaketleri ve isimli hediyeler.","description":"Ev ve ofis kapı isimlikleri, özel bir günü ya da yeri saklayan anı plaketleri, monogramlı tablolar ve kurumsal hediyeler. Her parça sizin metninizle, sizin için üretilir.","heroSwatch":"#6b5847","subcategories":[{"slug":"kapi-isimlikleri","title":"Kapı İsimlikleri & Tabelalar"},{"slug":"isimli-tablolar","title":"İsimli Tablolar"},{"slug":"ani-plaketleri","title":"Anı Plaketleri"},{"slug":"kurumsal-hediyeler","title":"Kurumsal Hediyeler"}],"facets":{"price":true,"subcategory":true,"material":true,"color":true,"availability":true},"seoTitle":"Kişiye Özel Ahşap Hediyeler | Kapı İsimliği ve Anı Plaketi","seoDescription":"İsimli kapı tabelaları, koordinatlı anı plaketleri, monogram tablolar ve logolu kurumsal hediyeler — ahşaptan, kişiye özel üretim.","faq":[{"question":"Metni sipariş sonrası değiştirebilir miyim?","answer":"Tasarım önizlemesini onaylayana kadar metni değiştirebilirsiniz; onaydan sonra üretim başlar."},{"question":"Kurumsal toplu sipariş veriyor musunuz?","answer":"Evet — logolu plaket ve tabelalar için adet ve teslim tarihini iletişim formundan iletin, size özel teklif hazırlayalım."}]}'::jsonb, true, now()),
      ('ahsap-aydinlatma', 'Ahşap Aydınlatma', 4, '{"shortDescription":"Işığı desene dönüştüren masa lambaları ve gece lambaları.","description":"Parametrik desenlerin ışıkla canlandığı masa lambaları, katmanlı gece lambaları ve abajurlar. Kompakt ölçüleriyle masa, komodin ve raf üstü için tasarlanır.","heroSwatch":"#8a6a4b","subcategories":[{"slug":"masa-lambalari","title":"Masa Lambaları"},{"slug":"gece-lambalari","title":"Gece Lambaları"},{"slug":"abajurlar","title":"Abajurlar"}],"facets":{"price":true,"subcategory":true,"material":true,"color":true,"availability":true},"seoTitle":"Ahşap Masa Lambası ve Gece Lambası | Parametrik Aydınlatma","seoDescription":"Parametrik desenli ahşap masa lambaları, katmanlı gece lambaları ve abajurlar — ışığı desene dönüştüren kompakt tasarımlar.","faq":[{"question":"Ampul ürünle birlikte geliyor mu?","answer":"Her ürün sayfasında ışık kaynağının dahil olup olmadığı ve kullanılabilecek ampul tipi belirtilir."},{"question":"Ahşap ısınır mı?","answer":"Lambalarımızı ısısı düşük LED ışık kaynaklarıyla kullanılmak üzere tasarlıyoruz; akkor ampul kullanmayın."}]}'::jsonb, true, now()),
      ('dekor-objeleri', 'Dekor Objeleri', 5, '{"shortDescription":"Heykelsi objeler, masaüstü düzenleyiciler ve küçük mobilyalar.","description":"Raf ve konsol üstü heykelsi objeler, masaüstü düzenleyiciler, dekoratif paneller ile tabure, yan sehpa ve duvar rafı gibi kargolanabilir küçük mobilyalar.","heroSwatch":"#3c3c3c","subcategories":[{"slug":"heykeller","title":"Heykeller"},{"slug":"kucuk-obje","title":"Küçük Objeler"},{"slug":"masaustu-duzenleyiciler","title":"Masaüstü Düzenleyiciler"},{"slug":"dekoratif-panel","title":"Dekoratif Paneller"},{"slug":"kucuk-mobilya","title":"Küçük Mobilya & Raflar"}],"facets":{"price":true,"material":true,"color":true,"subcategory":true,"availability":true},"seoTitle":"Parametrik Dekor Objeleri | Heykel, Düzenleyici ve Küçük Mobilya","seoDescription":"Heykelsi objeler, masaüstü düzenleyiciler, dekoratif paneller ve kargolanabilir küçük mobilyalar — parametrik tasarım anlayışıyla üretilir.","faq":[{"question":"Dekor ürünleri hediye paketinde gönderiliyor mu?","answer":"Talep üzerine hediye paketleme seçeneği sunuyoruz, sepette not olarak belirtebilirsiniz."},{"question":"Küçük mobilyalar kurulu mu geliyor?","answer":"Güvenli kargo için demonte gönderilir; montaj süresi ve zorluk seviyesi ürün sayfasında belirtilir."}]}'::jsonb, true, now())
    ON CONFLICT ("slug") DO UPDATE SET
      "title" = EXCLUDED."title",
      "sortOrder" = EXCLUDED."sortOrder",
      "content" = CASE
        WHEN "Category"."content" ? 'heroImage'
          THEN EXCLUDED."content" || jsonb_build_object('heroImage', "Category"."content"->'heroImage')
        ELSE EXCLUDED."content"
      END,
      "updatedAt" = now();

  -- Carry over banners uploaded for the categories being merged.
  UPDATE "Category" AS c
    SET "content" = c."content" || jsonb_build_object('heroImage', old."content"->'heroImage')
    FROM "Category" AS old
    WHERE (c."slug", old."slug") IN (('duvar-tablolari', 'parametrik-duvar-tablolari'), ('dekor-objeleri', 'dekorlar'))
      AND old."content" ? 'heroImage'
      AND NOT c."content" ? 'heroImage';

  UPDATE "Product" SET "categorySlug" = 'duvar-tablolari'
    WHERE "categorySlug" = 'parametrik-duvar-tablolari';
  UPDATE "Product" SET "categorySlug" = 'duvar-tablolari', "subcategory" = 'katmanli-tablolar'
    WHERE "categorySlug" = 'katmanli-multilayer-tablolar';
  UPDATE "Product" SET "categorySlug" = 'dekor-objeleri', "subcategory" = 'kucuk-mobilya'
    WHERE "categorySlug" = 'parametrik-mobilyalar';
  UPDATE "Product" SET "categorySlug" = 'ahsap-aydinlatma', "subcategory" = 'abajurlar'
    WHERE "categorySlug" = 'dekorlar' AND "subcategory" = 'aydinlatma-aksesuari';
  UPDATE "Product" SET "categorySlug" = 'dekor-objeleri'
    WHERE "categorySlug" = 'dekorlar';
  UPDATE "Product" SET "subcategory" = 'geometrik-desenler'
    WHERE "categorySlug" = 'duvar-saatleri' AND "subcategory" = 'buyuk-boy-saatler';

  DELETE FROM "Category"
    WHERE "slug" IN ('parametrik-duvar-tablolari', 'katmanli-multilayer-tablolar', 'parametrik-mobilyalar', 'dekorlar');
END $$;
