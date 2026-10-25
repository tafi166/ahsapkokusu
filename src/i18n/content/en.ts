import type { ContentTranslations } from "@/i18n/content/types";

/**
 * English content — the reviewed translation draft. It applies until an editor
 * saves English text for the same block in the admin panel (`/admin` →
 * İngilizce), which then replaces it block by block.
 *
 * Claims marked "verify" repeat the Turkish copy and must be checked before
 * launch, in both languages.
 */
export const enDefaults: ContentTranslations = {
  brand: {
    tagline: "Parametric Art. Transforming Spaces.",
    description:
      "Parametric wall art, multilayer pieces, furniture, wall clocks and decorative objects — made with CNC and laser cutting.",
    contact: { address: "Istanbul, Türkiye" },
  },

  announcementMessages: [
    "Shipping across Türkiye — free on eligible items",
    "Every piece is precision-cut by CNC and finished by hand",
    "Custom sizes and designs made for your space",
  ],

  homeContent: {
    hero: {
      eyebrow: "Parametric Design Studio",
      title: "Parametric Art.\nTransforming Spaces.",
      subtitle:
        "Wall art, furniture and decorative objects built from algorithmic patterns and made with CNC and laser cutting.",
      primaryCtaLabel: "Explore the Collection",
      secondaryCtaLabel: "View Multilayer Art",
      trustBadge: "500+ happy customers", // verify
    },
    categoryShowcase: { title: "Categories", subtitle: "Five collections, one design philosophy." },
    featuredProducts: { title: "Featured Pieces", subtitle: "Signature pieces from our studio.", ctaLabel: "View All" },
    bestSellers: { title: "Best Sellers", subtitle: "Our customers' favourite designs." },
    newArrivals: { title: "New Arrivals", subtitle: "Fresh from the studio." },
    partnerLogos: { title: "Chosen by Leading Brands in Türkiye" }, // verify
    trustSignals: { title: "Why Ahşap Kokusu" },
    testimonials: { title: "What Our Customers Say", subtitle: "500+ verified reviews and counting." }, // verify
    parametricStory: {
      eyebrow: "What Is Parametric Design?",
      title: "Art Shaped by Algorithms",
      body: "Parametric design is a way of making things shaped by mathematical rules and variables. Each piece is designed on the computer so that the parameters we set produce a unique geometry — then CNC and laser cutting carry it into wood. The result is a texture where nature meets mathematics, one you won't find in mass production.",
      ctaLabel: "Discover the Process",
    },
    blog: {
      title: "From the Studio",
      subtitle: "Design ideas, how we make things, and stories from behind the scenes.",
      ctaLabel: "Visit the Blog",
    },
    materialCraft: {
      eyebrow: "Material & Craft",
      title: "From Wood to Art",
      body: "Every piece is CNC-machined from selected MDF, plywood or solid wood, then sanded and finished by hand. The number of layers, the material and the finish give each piece its character — this is studio craft, not mass production.",
    },
    customDesign: {
      eyebrow: "Custom Design",
      title: "Designed for Your Space",
      body: "A portrait from your own photo, a logo panel for your brand, or a composition that is entirely yours — let's bring it to life through parametric design.",
      ctaLabel: "Request a Custom Design",
    },
    finalCta: { title: "Let's Make the Design You Have in Mind.", ctaLabel: "Get in Touch" },
    newsletter: {
      title: "Join Our Studio List",
      subtitle: "New patterns, limited-run pieces and design inspiration — no spam, unsubscribe any time.",
      placeholder: "Your email address",
      ctaLabel: "Join",
      successMessage: "You're on the list! Check your inbox for our welcome email.",
    },
  },

  productFaq: [
    {
      question: "How long does production take?",
      answer: "In-stock items ship within 3–5 working days. Made-to-order pieces take 2–3 weeks.",
    },
    {
      question: "Can I customise the size?",
      answer:
        "Most products can be made to a custom size. Choose the closest standard option and add the size you want in the order note; we'll contact you to confirm.",
    },
    {
      question: "What is your returns policy?",
      answer:
        "Items shipped from stock can be returned within 30 days in their original packaging. Made-to-order and personalised items can't be returned once production has started.",
    },
    {
      question: "Do you ship outside Türkiye?",
      answer: "For now we ship within Türkiye only. For international delivery, please get in touch through the contact form.",
    },
  ],

  // Placeholder testimonials, like the Turkish ones — replace with real reviews before launch.
  testimonials: {
    t1: {
      role: "Homeowner, Istanbul",
      quote: "The multilayer piece became the focal point of our living room. Delivery was quick and the packaging was perfect.",
    },
    t2: {
      role: "Interior Architect",
      quote:
        "I've ordered parametric furniture for three different projects. The quality is consistent and custom sizes are never a problem.",
    },
    t3: {
      role: "Café Owner",
      quote: "The reception desk is the first thing our customers ask about. Production was quicker than I expected.",
    },
    t4: {
      role: "Homeowner, Ankara",
      quote: "I ordered a personalised wall clock as a gift and it was a big hit. I'll definitely order again.",
    },
  },

  trustSignals: {
    ts1: { title: "Studio Craftsmanship", description: "Every piece is CNC-cut to order and finished by hand — never mass-produced." },
    ts2: { title: "Free Shipping", description: "Free delivery across Türkiye on eligible items." },
    ts3: { title: "Flexible Payment", description: "Pay in full or in instalments." }, // verify
    ts4: { title: "Happy Customers", description: "Hundreds of verified five-star reviews." }, // verify
  },

  blogPosts: {
    b1: {
      title: "What Is Parametric Design and How Is It Made?",
      excerpt: "A step-by-step look at the journey from algorithmic pattern to CNC cut.",
    },
    b2: {
      title: "How to Choose the Right Number of Layers for Multilayer Art",
      excerpt: "From 3 layers to 11 — a guide based on room size and how much depth you want.",
    },
    b3: {
      title: "Materials and Care: Keeping Your Wooden Pieces Like New",
      excerpt: "The finishes we use, how they hold up indoors and outdoors, and a two-minute monthly care routine.",
    },
  },

  categories: {
    "parametrik-duvar-tablolari": {
      slug: "parametric-wall-art",
      title: "Parametric Wall Art",
      shortDescription: "CNC and laser-cut wall art built from algorithmic patterns.",
      description:
        "Wall art with geometric and organic patterns, created with parametric design software. Each design is tuned to give the wood a texture that comes alive with light and shadow.",
      seoTitle: "Parametric Wall Art | Modern CNC Wood Art",
      seoDescription:
        "CNC and laser-cut parametric wall art with algorithmic patterns. Portraits, animals, cars and abstract designs — in sizes and materials made for your space.",
      subcategories: {
        "portre-ve-figur": "Portraits & Figures",
        "hayvan-figurleri": "Animals",
        "arac-ve-motor": "Cars & Motorsport",
        "soyut-ve-geometrik": "Abstract & Geometric",
        "ozel-tasarimlar": "Custom Designs",
      },
      faq: [
        {
          question: "What are the pieces made from?",
          answer: "We work in MDF, plywood and solid wood; each product page lists the materials available.",
        },
        {
          question: "Can I have a piece made from my own image?",
          answer: "Yes — send us your photo or pattern through the Custom Designs subcategory or the contact form.",
        },
      ],
    },
    "katmanli-multilayer-tablolar": {
      slug: "multilayer-wall-art",
      title: "Multilayer Wall Art",
      shortDescription: "Layered wood compositions with a real sense of depth.",
      description:
        "Multilayer pieces built from several wooden layers set at different depths, available with 3 to 11 layers. The way light passes through and shadows play across them sets them apart from ordinary wall art.",
      seoTitle: "Multilayer Wall Art | Layered Wooden Wall Art",
      seoDescription:
        "Multilayer wood art in 3, 5, 7, 9 and 11 layers. Designs with real depth, with frame and mounting options.",
      subcategories: {
        "3-katman": "3 Layers",
        "5-katman": "5 Layers",
        "7-katman": "7 Layers",
        "9-katman": "9 Layers",
        "11-katman": "11 Layers",
      },
      faq: [
        {
          question: "How does the number of layers affect the price?",
          answer:
            "More layers mean more material and more work, so the price goes up — each product page updates the price for the layer count you choose.",
        },
        {
          question: "Is a frame included?",
          answer: "The frame is a separate option on the product page; you can order without a frame or with a wooden or metal one.",
        },
      ],
    },
    "parametrik-mobilyalar": {
      slug: "parametric-furniture",
      title: "Parametric Furniture",
      shortDescription: "CNC furniture that combines function with sculptural form.",
      description:
        "From chairs to reception desks: furniture designed with parametric algorithms and structurally optimised. Made for homes and commercial projects alike.",
      seoTitle: "Parametric Furniture | Design-Led CNC Furniture",
      seoDescription:
        "Parametric furniture including chairs, coffee tables, TV units and reception desks. Customisable in material, size and colour.",
      subcategories: {
        "sandalye-ve-tabure": "Chairs & Stools",
        "sehpa-ve-masa": "Coffee & Dining Tables",
        "raf-ve-tv-unitesi": "Shelving & TV Units",
        "resepsiyon-ve-ofis": "Reception & Office",
        "bench-ve-oturma": "Benches & Seating",
      },
      faq: [
        {
          question: "Does the furniture need assembly?",
          answer: "Most pieces need simple assembly; each product page gives the assembly time and difficulty.",
        },
      ],
    },
    "duvar-saatleri": {
      slug: "wall-clocks",
      title: "Wall Clocks",
      shortDescription: "Wall clocks with parametric patterns and silent movements.",
      description:
        "Wall clocks with geometric and organic patterns, made in a range of diameters and materials. A silent movement makes them at home in any room.",
      seoTitle: "Parametric Wall Clocks | Designer Clock Collection",
      seoDescription:
        "Parametric-pattern wall clocks in a range of diameters and materials. Silent movement, personalisation options.",
      subcategories: {
        "geometrik-desenler": "Geometric Patterns",
        "minimal-saatler": "Minimal Clocks",
        "buyuk-boy-saatler": "Oversized Clocks",
      },
      faq: [
        { question: "Is the clock movement silent?", answer: "Yes, every clock uses a silent sweep movement." },
        {
          question: "Can I add a name or date?",
          answer: "On models with a personalisation option, you can add text from the product page.",
        },
      ],
    },
    dekorlar: {
      slug: "decor",
      title: "Decor",
      shortDescription: "Sculptural objects and small-scale parametric decor.",
      description:
        "Sculptural and decorative parametric objects that don't fit the other collections — from shelf pieces to lighting accessories.",
      seoTitle: "Parametric Decor Objects | Designer Accessories",
      seoDescription:
        "Sculptural objects, small decor pieces and lighting accessories — made with a parametric design approach.",
      subcategories: {
        heykeller: "Sculptures",
        "kucuk-obje": "Small Objects",
        "aydinlatma-aksesuari": "Lighting Accessories",
        "dekoratif-panel": "Decorative Panels",
      },
      faq: [
        {
          question: "Can decor items be gift-wrapped?",
          answer: "We offer gift wrapping on request — just add a note in your basket.",
        },
      ],
    },
  },

  products: {
    "wa-1": {
      slug: "parametric-portrait-silhouette-series",
      title: "Parametric Portrait — Silhouette Series",
      shortTitle: "Silhouette Portrait",
      shortDescription: "A CNC-machined portrait silhouette you can customise.",
      description:
        "A portrait silhouette built from algorithmic profile lines and CNC-machined from a single piece of wood. You can ask for one made from your own photo.",
      personalizationOptions: ["Silhouette from your own photo"],
      tags: ["portrait", "silhouette", "customisable", "cnc"],
    },
    "wa-2": {
      slug: "jaguar-parametric-wall-art",
      title: "Jaguar Parametric Wall Art",
      shortDescription: "Wall art of a jaguar in a polygon texture.",
      description:
        "A jaguar in faceted polygons, caught in motion. Available as a finished piece or as a digital file to cut on your own CNC or laser machine.",
      includedFiles: ["Cutting file", "Assembly diagram"],
      tags: ["animal", "jaguar", "digital file", "laser cutting"],
    },
    "wa-3": {
      slug: "octopus-parametric-wall-art",
      title: "Octopus Parametric Wall Art",
      shortDescription: "An octopus in flowing, organic lines.",
      description: "An octopus whose flowing arms form an organic composition, made from multiple cut wooden pieces.",
      tags: ["animal", "octopus", "organic"],
    },
    "wa-4": {
      slug: "formula-race-car-wall-art",
      title: "Formula Race Car Wall Art",
      shortDescription: "A Formula car digital cutting file.",
      description:
        "A Formula car silhouette reimagined in parametric lines — a digital design file to make on your own laser cutter.",
      includedFiles: ["Cutting file", "User guide"],
      tags: ["vehicle", "formula", "motorsport", "digital file"],
    },
    "wa-5": {
      slug: "aircraft-silhouette-parametric-art",
      title: "Aircraft Silhouette Parametric Art",
      shortDescription: "Layered aircraft silhouette wall art.",
      description: "An aircraft silhouette given depth by layered wood cutting.",
      tags: ["vehicle", "aircraft", "silhouette"],
    },
    "wa-6": {
      slug: "geometric-wave-pattern-art",
      title: "Geometric Wave Pattern Art",
      shortDescription: "Abstract art with a repeating wave pattern.",
      description: "An abstract composition with a repeating wave pattern, generated by a parametric algorithm.",
      tags: ["abstract", "geometric", "wave"],
    },
    "wa-7": {
      slug: "organic-flow-pattern-art",
      title: "Organic Flow Pattern Art",
      shortDescription: "Minimal art with a flowing organic pattern.",
      description: "A parametric texture of flowing, organic curves — designed for minimal interiors.",
      tags: ["abstract", "organic", "minimal"],
    },
    "ml-1": {
      slug: "3-layer-mountain-landscape-multilayer-art",
      title: "3-Layer Mountain Landscape Multilayer Art",
      shortDescription: "A 3-layer mountain silhouette composition.",
      description:
        "A simple mountain silhouette made from three wooden layers set at different depths — a compact size that suits a hallway.",
      assemblyTime: "10 min",
      tags: ["multilayer", "landscape", "3 layers"],
    },
    "ml-2": {
      slug: "5-layer-forest-silhouette-multilayer-art",
      title: "5-Layer Forest Silhouette Multilayer Art",
      shortDescription: "A 5-layer forest silhouette — our most popular option.",
      description:
        "A forest silhouette with five layers of depth from foreground to background — our most popular layer count.",
      assemblyTime: "15 min",
      tags: ["multilayer", "forest", "5 layers", "best seller"],
    },
    "ml-3": {
      slug: "7-layer-city-skyline-multilayer-art",
      title: "7-Layer City Skyline Multilayer Art",
      shortDescription: "A 7-layer city skyline composition.",
      description: "A city skyline worked in seven layers — a striking focal point for office and living-room walls.",
      assemblyTime: "20 min",
      tags: ["multilayer", "city", "7 layers"],
    },
    "ml-4": {
      slug: "9-layer-deep-ocean-multilayer-art",
      title: "9-Layer Deep Ocean Multilayer Art",
      shortDescription: "A 9-layer wave and ocean composition.",
      description: "A large piece whose nine layers give the movement of the waves a three-dimensional feel.",
      assemblyTime: "25 min",
      tags: ["multilayer", "ocean", "9 layers"],
    },
    "ml-5": {
      slug: "11-layer-galaxy-multilayer-art",
      title: "11-Layer Galaxy Multilayer Art",
      shortDescription: "Our flagship piece, with the most layers we make.",
      description: "The deepest piece in our collection — 11 layers bring a galaxy or nebula to life in three dimensions.",
      assemblyTime: "30 min",
      tags: ["multilayer", "galaxy", "11 layers", "premium"],
    },
    "fu-1": {
      slug: "parametric-chair-voro-series",
      title: "Parametric Chair — Voro Series",
      shortDescription: "A lightweight chair with a Voronoi pattern.",
      description: "A chair whose seat is optimised with a Voronoi algorithm — structurally light, yet strong.",
      assemblyTime: "30 min",
      tags: ["furniture", "chair", "voronoi"],
    },
    "fu-2": {
      slug: "parametric-bar-stool-lamella",
      title: "Parametric Bar Stool — Lamella",
      shortDescription: "A bar stool built from wooden slats.",
      description: "A stool made from thin wooden slats stacked in a circle, designed for kitchen islands and bars.",
      assemblyTime: "20 min",
      tags: ["furniture", "stool", "bar"],
    },
    "fu-3": {
      slug: "parametric-coffee-table-nova",
      title: "Parametric Coffee Table — Nova",
      shortDescription: "A coffee table with a sculptural base.",
      description: "A sculptural coffee table with a base inspired by a starburst.",
      assemblyTime: "15 min",
      tags: ["furniture", "coffee table"],
    },
    "fu-4": {
      slug: "parametric-dining-table-terra",
      title: "Parametric Dining Table — Terra",
      shortDescription: "A six-seat dining table with a sculptural base.",
      description: "A six-seat dining table with a base inspired by the rings of a tree trunk.",
      assemblyTime: "60 min",
      tags: ["furniture", "dining table", "premium"],
    },
    "fu-5": {
      slug: "parametric-tv-unit-lineo",
      title: "Parametric TV Unit — Lineo",
      shortDescription: "A slatted TV unit with hidden cable management.",
      description: "A TV unit for modern living rooms, with horizontal slats and a hidden cable channel.",
      assemblyTime: "45 min",
      tags: ["furniture", "tv unit"],
    },
    "fu-6": {
      slug: "parametric-reception-desk-atrium",
      title: "Parametric Reception Desk — Atrium",
      shortDescription: "A customisable reception desk for commercial projects.",
      description:
        "A large reception desk with a parametric front, designed for commercial projects. Size and logo integration are tailored to each project.",
      personalizationOptions: ["Logo and brand integration", "Custom size"],
      assemblyTime: "Installed on site",
      tags: ["furniture", "reception", "commercial", "custom project"],
    },
    "fu-7": {
      slug: "parametric-bench-duna",
      title: "Parametric Bench — Duna",
      shortDescription: "A versatile bench with a wave-shaped top.",
      description: "A bench with a rippled top inspired by sand dunes, for sitting on or displaying things.",
      tags: ["furniture", "bench", "seating"],
    },
    "cl-1": {
      slug: "geometric-wall-clock-radial",
      title: "Geometric Wall Clock — Radial",
      shortDescription: "A wall clock with a radial geometric pattern.",
      description: "A wall clock of geometric segments radiating from the centre, with a silent movement.",
      tags: ["clock", "geometric"],
    },
    "cl-2": {
      slug: "minimal-line-wall-clock-mono",
      title: "Minimal Line Wall Clock — Mono",
      shortDescription: "A simple, single-colour minimal wall clock.",
      description: "A pared-back design in a single colour, with fine line hands.",
      tags: ["clock", "minimal"],
    },
    "cl-3": {
      slug: "oversized-parametric-wall-clock-orbit",
      title: "Oversized Parametric Wall Clock — Orbit",
      shortDescription: "A multilayer oversized wall clock.",
      description: "A layered oversized wall clock inspired by orbital rings — a focal point for large walls.",
      tags: ["clock", "oversized", "orbit"],
    },
    "cl-4": {
      slug: "personalised-name-wall-clock-family",
      title: "Personalised Name Wall Clock — Family",
      shortDescription: "A wall clock personalised with names or a date.",
      description: "A personalised design with family names or a special date worked into the clock face.",
      personalizationOptions: ["Name", "Date"],
      tags: ["clock", "personalised", "gift"],
    },
    "de-1": {
      slug: "parametric-table-sculpture-flow",
      title: "Parametric Table Sculpture — Flow",
      shortDescription: "A tabletop sculpture with a flowing form.",
      description: "A small sculpture with a flowing form, designed for a shelf or console.",
      tags: ["decor", "sculpture", "tabletop"],
    },
    "de-2": {
      slug: "small-decorative-object-cell",
      title: "Small Decorative Object — Cell",
      shortDescription: "A minimal decorative object with a cell pattern.",
      description: "A minimal decorative object of interlocking pieces, inspired by cell structures.",
      tags: ["decor", "small object"],
    },
    "de-3": {
      slug: "parametric-lampshade-lumin",
      title: "Parametric Lampshade — Lumin",
      shortDescription: "A lampshade that casts patterned light.",
      description: "A wooden lampshade that fits your existing bulb or light fitting and casts light in a pattern.",
      assemblyTime: "5 min",
      tags: ["decor", "lighting", "lampshade"],
    },
    "de-4": {
      slug: "decorative-wall-panel-mesh",
      title: "Decorative Wall Panel — Mesh",
      shortDescription: "A mesh-textured decorative panel that tiles.",
      description: "A decorative panel with a mesh texture, hung on its own or tiled across larger walls.",
      tags: ["decor", "panel", "wall"],
    },
    "de-5": {
      slug: "mini-sculpture-set-trio",
      title: "Mini Sculpture Set — Trio",
      shortDescription: "A set of three mini sculptures.",
      description: "A set of three mini sculptures in different heights, designed for styling a shelf.",
      tags: ["decor", "sculpture", "set"],
    },
  },

  optionLabels: {
    Doğal: "Natural",
    Ceviz: "Walnut",
    "Koyu Ceviz": "Dark Walnut",
    Siyah: "Black",
    Beyaz: "White",
    Gri: "Grey",
    "Mavi Tonlu Lake": "Blue-Tinted Lacquer",
    "Karışık Tonlar": "Mixed Tones",
    "Doğal Vernik": "Natural Varnish",
    "Mat Siyah": "Matte Black",
    "Doğal Yağ": "Natural Oil",
    "Ceviz Kaplama": "Walnut Veneer",
    "Beyaz Lake": "White Lacquer",
    Çerçevesiz: "No Frame",
    "Ahşap Çerçeve": "Wooden Frame",
    "Metal Çerçeve": "Metal Frame",
    Kontrplak: "Plywood",
    "Masif Ahşap": "Solid Wood",
    "Masif Ceviz": "Solid Walnut",
    "Masif Meşe": "Solid Oak",
    "MDF Lam": "Laminated MDF",
    "MDF Lam + Metal İskelet": "Laminated MDF + Metal Frame",
  },
};
