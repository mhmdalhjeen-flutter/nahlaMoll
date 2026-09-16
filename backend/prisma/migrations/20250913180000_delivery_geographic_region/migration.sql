-- Add geographic region enum for customer navigation anchors (nullable for existing rows).
CREATE TYPE "DeliveryRegion" AS ENUM ('NORTH', 'GAZA', 'MIDDLE', 'SOUTH');

ALTER TABLE "DeliveryArea" ADD COLUMN "region" "DeliveryRegion";

CREATE INDEX "DeliveryArea_region_idx" ON "DeliveryArea"("region");
