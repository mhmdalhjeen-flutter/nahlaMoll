-- Delivery area hierarchy + tiered free-delivery product contributions
CREATE TYPE "DeliveryAreaType" AS ENUM ('MAIN', 'SUB_NEAR', 'SUB_FAR');

ALTER TABLE "DeliveryArea" ADD COLUMN "areaType" "DeliveryAreaType" NOT NULL DEFAULT 'MAIN';
ALTER TABLE "DeliveryArea" ADD COLUMN "parentId" TEXT;

ALTER TABLE "DeliveryArea"
  ADD CONSTRAINT "DeliveryArea_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "DeliveryArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "DeliveryArea_parentId_idx" ON "DeliveryArea"("parentId");
CREATE INDEX "DeliveryArea_areaType_idx" ON "DeliveryArea"("areaType");

ALTER TABLE "Product" ADD COLUMN "freeDeliveryValueSubNear" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "freeDeliveryValueSubFar" DECIMAL(65,30) NOT NULL DEFAULT 0;
