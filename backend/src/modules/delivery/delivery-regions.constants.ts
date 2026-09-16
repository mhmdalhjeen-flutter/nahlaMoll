import { DeliveryRegion } from "@prisma/client";

export const DELIVERY_REGIONS: DeliveryRegion[] = [
  DeliveryRegion.NORTH,
  DeliveryRegion.GAZA,
  DeliveryRegion.MIDDLE,
  DeliveryRegion.SOUTH,
];

export const DELIVERY_REGION_LABELS: Record<DeliveryRegion, string> = {
  [DeliveryRegion.NORTH]: "الشمال",
  [DeliveryRegion.GAZA]: "غزة",
  [DeliveryRegion.MIDDLE]: "الوسطى",
  [DeliveryRegion.SOUTH]: "الجنوب",
};
