import type { Product } from "@/types";
import { wallArtProducts } from "./wallArt";
import { multilayerProducts } from "./multilayer";
import { clockProducts } from "./clocks";
import { babyRoomProducts } from "./babyRoom";
import { giftProducts } from "./gifts";
import { lightingProducts } from "./lighting";
import { decorProducts } from "./decor";
import { furnitureProducts } from "./furniture";

/** Hand-written catalog — the storefront default, also used to seed the database. */
export const defaultProducts: Product[] = [
  ...wallArtProducts,
  ...multilayerProducts,
  ...clockProducts,
  ...babyRoomProducts,
  ...giftProducts,
  ...lightingProducts,
  ...decorProducts,
  ...furnitureProducts,
];
