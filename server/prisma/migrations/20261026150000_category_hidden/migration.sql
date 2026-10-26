-- A category can be made passive: it and its products leave the storefront but stay editable in the admin panel.
ALTER TABLE "Category" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
