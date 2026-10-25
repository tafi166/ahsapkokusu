-- Products can be hidden from the storefront and kept as drafts in the admin panel.
ALTER TABLE "Product" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
