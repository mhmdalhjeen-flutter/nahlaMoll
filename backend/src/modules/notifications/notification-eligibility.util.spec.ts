import { NotificationEventType } from "@prisma/client";
import {
  resolveInAppEligible,
  resolvePushEligible,
  type NotificationPreferenceSnapshot,
} from "./notification-eligibility.util";

const basePreferences: NotificationPreferenceSnapshot = {
  inAppEnabled: true,
  pushEnabled: true,
  orderUpdates: true,
  abuAlaaNews: true,
  doNotDisturbEnabled: false,
  doNotDisturbFrom: "22:00",
  doNotDisturbUntil: "08:00",
};

describe("notification eligibility", () => {
  it("allows push when enabled, supported, and category matches", () => {
    expect(
      resolvePushEligible(
        NotificationEventType.ORDER_CONFIRMED,
        basePreferences,
        true,
      ),
    ).toBe(true);
  });

  it("blocks push when pushSupported is false", () => {
    expect(
      resolvePushEligible(
        NotificationEventType.ORDER_CONFIRMED,
        basePreferences,
        false,
      ),
    ).toBe(false);
  });

  it("blocks push when pushEnabled is false", () => {
    expect(
      resolvePushEligible(
        NotificationEventType.ORDER_CONFIRMED,
        { ...basePreferences, pushEnabled: false },
        true,
      ),
    ).toBe(false);
  });

  it("blocks push when category preference is disabled", () => {
    expect(
      resolvePushEligible(
        NotificationEventType.ORDER_CONFIRMED,
        { ...basePreferences, orderUpdates: false },
        true,
      ),
    ).toBe(false);
  });

  it("keeps pushEligible true during DND because DND affects delivery only", () => {
    const dndPreferences = {
      ...basePreferences,
      doNotDisturbEnabled: true,
      doNotDisturbFrom: "00:00",
      doNotDisturbUntil: "23:59",
    };

    expect(
      resolvePushEligible(
        NotificationEventType.SUPPORT_REPLY,
        dndPreferences,
        true,
      ),
    ).toBe(true);
    expect(
      resolveInAppEligible(NotificationEventType.SUPPORT_REPLY, dndPreferences),
    ).toBe(true);
  });
});
