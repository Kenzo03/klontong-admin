/*
  Warnings:

  - The values [LITER,KILOGRAM] on the enum `Uom` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Uom_new" AS ENUM ('PCS', 'PACK', 'BOX', 'BOTTLE', 'CAN', 'SACHET', 'STRIP', 'SACK');
ALTER TABLE "public"."products" ALTER COLUMN "uom" DROP DEFAULT;
ALTER TABLE "products" ALTER COLUMN "uom" TYPE "Uom_new" USING ("uom"::text::"Uom_new");
ALTER TYPE "Uom" RENAME TO "Uom_old";
ALTER TYPE "Uom_new" RENAME TO "Uom";
DROP TYPE "public"."Uom_old";
ALTER TABLE "products" ALTER COLUMN "uom" SET DEFAULT 'PCS';
COMMIT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "actor_id" INTEGER,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(30) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "reason" VARCHAR(200),
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
