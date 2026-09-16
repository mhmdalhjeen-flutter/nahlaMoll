import {
  calculateProductUnitPrice,
  isProductOfferActive,
  parseOfferKindFromTags,
} from "./product-pricing.util";

describe("product-pricing.util", () => {
  const baseProduct = {
    price: 50,
    hasOffer: true,
    offerType: "PERCENTAGE",
    offerValue: 10,
    tags: ["offerKind:PERCENTAGE"],
  };

  it("returns normal price when no offer", () => {
    const result = calculateProductUnitPrice({ price: 50, hasOffer: false });
    expect(result.unitPrice).toBe(50);
    expect(result.hasDiscount).toBe(false);
  });

  it("applies percentage discount", () => {
    const result = calculateProductUnitPrice(baseProduct);
    expect(result.unitPrice).toBe(45);
    expect(result.originalUnitPrice).toBe(50);
    expect(result.discountLabel).toBe("خصم 10%");
  });

  it("applies fixed amount discount", () => {
    const result = calculateProductUnitPrice({
      price: 50,
      hasOffer: true,
      offerType: "FIXED_AMOUNT",
      offerValue: 10,
      tags: ["offerKind:CUSTOM"],
    });
    expect(result.unitPrice).toBe(40);
    expect(result.discountLabel).toBe("خصم 10 ₪");
  });

  it("applies special price offer", () => {
    const result = calculateProductUnitPrice({
      price: 50,
      hasOffer: true,
      offerType: "FIXED_AMOUNT",
      offerValue: 35,
      tags: ["offerKind:SPECIAL_PRICE"],
    });
    expect(result.unitPrice).toBe(35);
    expect(result.originalUnitPrice).toBe(50);
    expect(result.discountLabel).toBe("سعر خاص");
  });

  it("adds variant adjustment after offer on base price", () => {
    const result = calculateProductUnitPrice(baseProduct, 5);
    expect(result.unitPrice).toBe(50);
    expect(result.originalUnitPrice).toBe(55);
  });

  it("ignores expired offers", () => {
    expect(
      isProductOfferActive({
        ...baseProduct,
        offerEndDate: new Date("2020-01-01"),
      }),
    ).toBe(false);
  });

  it("parses offer kind from tags", () => {
    expect(parseOfferKindFromTags(["offerKind:SPECIAL_PRICE"])).toBe(
      "SPECIAL_PRICE",
    );
  });
});
