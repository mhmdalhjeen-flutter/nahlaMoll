import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  canCustomerCancelOrder,
  canDeleteOrder,
  isCashOnDeliveryOrder,
} from "./order.constants";

describe("order.constants", () => {
  describe("canCustomerCancelOrder", () => {
    it("allows pending and confirmed", () => {
      expect(canCustomerCancelOrder(OrderStatus.PENDING)).toBe(true);
      expect(canCustomerCancelOrder(OrderStatus.CONFIRMED)).toBe(true);
      expect(canCustomerCancelOrder(OrderStatus.PAYMENT_REJECTED)).toBe(true);
    });

    it("blocks shipped and delivered", () => {
      expect(canCustomerCancelOrder(OrderStatus.SHIPPED)).toBe(false);
      expect(canCustomerCancelOrder(OrderStatus.DELIVERED)).toBe(false);
      expect(canCustomerCancelOrder(OrderStatus.PROCESSING)).toBe(false);
    });
  });

  describe("canDeleteOrder", () => {
    it("allows delivered and cancelled only", () => {
      expect(canDeleteOrder(OrderStatus.DELIVERED)).toBe(true);
      expect(canDeleteOrder(OrderStatus.CANCELLED)).toBe(true);
      expect(canDeleteOrder(OrderStatus.PENDING)).toBe(false);
    });
  });

  describe("isCashOnDeliveryOrder", () => {
    it("detects COD orders", () => {
      expect(
        isCashOnDeliveryOrder({
          paymentReference: null,
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.PENDING,
        }),
      ).toBe(true);
    });

    it("detects electronic submitted orders", () => {
      expect(
        isCashOnDeliveryOrder({
          paymentReference: "Ahmed",
          paymentStatus: PaymentStatus.SUBMITTED,
          status: OrderStatus.PAYMENT_SUBMITTED,
        }),
      ).toBe(false);
    });
  });
});
