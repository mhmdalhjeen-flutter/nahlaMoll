import { DeliveryAreaType, Prisma } from "@prisma/client";

export interface ProductFreeDeliveryFields {
  freeDeliveryValue: Prisma.Decimal | number | string;
  freeDeliveryValueSubNear?: Prisma.Decimal | number | string | null;
  freeDeliveryValueSubFar?: Prisma.Decimal | number | string | null;
}

/** Resolves the effective contribution % for a product given the customer's delivery area type. */
export function resolveFreeDeliveryContribution(
  product: ProductFreeDeliveryFields,
  areaType: DeliveryAreaType = DeliveryAreaType.MAIN,
): Prisma.Decimal {
  const main = new Prisma.Decimal(product.freeDeliveryValue ?? 0);

  if (areaType === DeliveryAreaType.SUB_NEAR) {
    const subNear = product.freeDeliveryValueSubNear;
    if (subNear != null && !new Prisma.Decimal(subNear).isZero()) {
      return new Prisma.Decimal(subNear);
    }
    return main;
  }

  if (areaType === DeliveryAreaType.SUB_FAR) {
    const subFar = product.freeDeliveryValueSubFar;
    if (subFar != null && !new Prisma.Decimal(subFar).isZero()) {
      return new Prisma.Decimal(subFar);
    }
    return main;
  }

  return main;
}
