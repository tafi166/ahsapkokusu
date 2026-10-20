import type { Product } from "@/types";
import { wallArtProducts } from "./wallArt";
import { multilayerProducts } from "./multilayer";
import { furnitureProducts } from "./furniture";
import { clockProducts } from "./clocks";
import { decorProducts } from "./decor";

/** Hand-written catalog — the storefront default, also used to seed the database. */
export const defaultProducts: Product[] = [
  ...wallArtProducts,
  ...multilayerProducts,
  ...furnitureProducts,
  ...clockProducts,
  ...decorProducts,
];
