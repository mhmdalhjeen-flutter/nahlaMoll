import { DeliveryAreaType, Prisma } from "@prisma/client";
import { resolveFreeDeliveryContribution } from "./product-free-delivery.util";

describe("resolveFreeDeliveryContribution", () => {
  const product = {
    freeDeliveryValue: 10,
    freeDeliveryValueSubNear: 20,
    freeDeliveryValueSubFar: 30,
  };

  it("uses main value for MAIN areas", () => {
    expect(
      resolveFreeDeliveryContribution(
        product,
        DeliveryAreaType.MAIN,
      ).toNumber(),
    ).toBe(10);
  });

  it("uses sub-near value for SUB_NEAR areas", () => {
    expect(
      resolveFreeDeliveryContribution(
        product,
        DeliveryAreaType.SUB_NEAR,
      ).toNumber(),
    ).toBe(20);
  });

  it("uses sub-far value for SUB_FAR areas", () => {
    expect(
      resolveFreeDeliveryContribution(
        product,
        DeliveryAreaType.SUB_FAR,
      ).toNumber(),
    ).toBe(30);
  });

  it("falls back to main when sub values are zero", () => {
    const legacy = {
      freeDeliveryValue: new Prisma.Decimal(15),
      freeDeliveryValueSubNear: 0,
      freeDeliveryValueSubFar: 0,
    };
    expect(
      resolveFreeDeliveryContribution(
        legacy,
        DeliveryAreaType.SUB_NEAR,
      ).toNumber(),
    ).toBe(15);
    expect(
      resolveFreeDeliveryContribution(
        legacy,
        DeliveryAreaType.SUB_FAR,
      ).toNumber(),
    ).toBe(15);
  });
});
