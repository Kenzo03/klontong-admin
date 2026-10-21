-- Business rules Prisma cannot express; the DTOs check the same rules first.
ALTER TABLE "products"
  ADD CONSTRAINT "products_price_nonneg"      CHECK ("price" >= 0),
  ADD CONSTRAINT "products_stock_nonneg"      CHECK ("stock" >= 0),
  ADD CONSTRAINT "products_size_positive"     CHECK ("weight" > 0 AND "width" > 0 AND "length" > 0 AND "height" > 0),
  ADD CONSTRAINT "products_sku_format"        CHECK ("sku" ~ '^[A-Z0-9-]{3,50}$'),
  ADD CONSTRAINT "products_name_not_blank"    CHECK (btrim("name") <> ''),
  ADD CONSTRAINT "products_archived_inactive" CHECK ("archived_at" IS NULL OR "is_active" = false),
  ADD CONSTRAINT "products_image_path"        CHECK ("image" IS NULL OR "image" ~ '^/uploads/products/[0-9a-f-]{36}\.(jpg|png|webp)$');

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));

ALTER TABLE "categories" 
  ADD CONSTRAINT "categories_name_not_blank" CHECK (btrim("name") <> '');