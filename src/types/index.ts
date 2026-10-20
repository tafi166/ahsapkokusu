export interface NavLink {
  label: string;
  href: string;
}

export interface NavItem extends NavLink {
  /** Optional dropdown/mega-menu children. */
  children?: NavLink[];
  /** Optional column heading used when children are grouped in a mega-menu. */
  megaMenu?: boolean;
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface Testimonial {
  id: string;
  authorInitial: string;
  rating: 1 | 2 | 3 | 4 | 5;
  quote: string;
  role: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  swatch: string;
}

export interface TrustSignal {
  id: string;
  title: string;
  description: string;
  icon: "craft" | "shipping" | "payments" | "reviews";
}

export interface FaqItem {
  question: string;
  answer: string;
}

// ---------------------------------------------------------------------------
// Category schema
// ---------------------------------------------------------------------------

/** The 5 top-level categories — slugs double as the SEO-friendly route segment. */
export type CategorySlug =
  | "parametrik-duvar-tablolari"
  | "katmanli-multilayer-tablolar"
  | "parametrik-mobilyalar"
  | "duvar-saatleri"
  | "dekorlar";

/**
 * Declares which filter facets a category page should render — keeps
 * FilterDrawer generic/reusable. Only lists facets that map to an actual
 * discrete/categorical Product field (dimensions are numeric and shown on
 * the product page, not offered as checkbox filters here).
 */
export interface CategoryFacetConfig {
  price?: boolean;
  availability?: boolean;
  material?: boolean;
  color?: boolean;
  /** Filters by `product.subcategory` — labeled per-category (e.g. "Mobilya Tipi", "Desen Tipi"). */
  subcategory?: boolean;
  layerCount?: boolean;
}

export interface Subcategory {
  slug: string;
  title: string;
}

export interface Category {
  slug: CategorySlug;
  title: string;
  shortDescription: string;
  description: string;
  heroSwatch: string;
  subcategories: Subcategory[];
  facets: CategoryFacetConfig;
  seoTitle: string;
  seoDescription: string;
  faq: FaqItem[];
}

// ---------------------------------------------------------------------------
// Product schema
// ---------------------------------------------------------------------------

export type ProductType = "wall-art" | "multilayer-art" | "furniture" | "wall-clock" | "decor";

export type ProductDeliveryType = "DIGITAL" | "PHYSICAL" | "BOTH";

export type Availability = "in-stock" | "made-to-order" | "sold-out" | "digital";

export interface Dimensions {
  width?: number;
  height?: number;
  depth?: number;
  diameter?: number;
  thickness?: number;
  unit: "cm" | "in";
}

/** All option groups a product might expose — a given product only sets the ones relevant to its type. */
export interface ProductVariantOptions {
  sizes?: string[];
  widths?: string[];
  colors?: string[];
  finishes?: string[];
  layerCounts?: number[];
  frames?: string[];
  heightRange?: [number, number];
  /**
   * Explicit, business-defined surcharges for specific options. No seed
   * product defines any — without a rule the price is the base price.
   */
  priceAdjustments?: VariantPriceAdjustment[];
}

/** The option values that identify a configuration (no UI state). */
export interface ConfiguredOptions {
  size?: string;
  width?: string;
  layerCount?: number;
  color?: string;
  finish?: string;
  frame?: string;
  height?: number;
}

/** What the variant selector reports: the chosen options plus whether every required group is set. */
export interface VariantSelection extends ConfiguredOptions {
  isComplete: boolean;
}

/** Discrete option axes a surcharge can attach to (height has no pricing rule yet). */
export type PricedAxis = "size" | "width" | "layerCount" | "color" | "finish" | "frame";

/** A surcharge added to the base price when `axis` has exactly `value` selected. */
export interface VariantPriceAdjustment {
  axis: PricedAxis;
  value: string | number;
  /** In the product's own currency. */
  amount: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string;
  category: CategorySlug;
  subcategory?: string;
  description: string;
  shortDescription?: string;

  price: number;
  compareAtPrice?: number;
  currency: "TRY" | "USD";

  /** Placeholder swatch colors standing in for real photography (see lib/placeholder.ts) — first is the card thumbnail. */
  images: string[];
  thumbnail: string;

  material?: string;
  materials?: string[];

  dimensions?: Dimensions;
  weightKg?: number;

  colors?: string[];
  finishes?: string[];
  layerCount?: number;

  productType: ProductType;
  productionMethod?: "CNC Routing" | "Laser Cutting" | "CNC + Hand Finishing";

  /** Digital-delivery fields — set when deliveryType is DIGITAL or BOTH. */
  fileTypes?: string[];
  includedFiles?: string[];
  softwareCompatibility?: string[];

  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  assemblyRequired?: boolean;
  assemblyTime?: string;

  customizable?: boolean;
  personalizationOptions?: string[];

  variants?: ProductVariantOptions;

  stock?: number;
  availability: Availability;
  deliveryType: ProductDeliveryType;

  featured?: boolean;
  bestSeller?: boolean;
  newProduct?: boolean;

  rating?: number;
  reviewCount?: number;

  tags: string[];

  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];

  createdAt: string;
  updatedAt: string;
}
