import { readFileSync } from "fs";
import { join } from "path";
import {
  convertLegacyContribution,
  decideMigrationAction,
  LEGACY_DEFAULT_TARGET,
  migrationSqlTouchesOrders,
  resolveLegacyTarget,
} from "./free-delivery-migration.util";

describe("free-delivery-migration.util", () => {
  describe("resolveLegacyTarget", () => {
    it("uses legacy default 10 for NULL", () => {
      expect(resolveLegacyTarget(null)).toBe(10);
    });

    it("uses legacy default 10 for zero", () => {
      expect(resolveLegacyTarget(0)).toBe(10);
    });

    it("preserves positive configured targets", () => {
      expect(resolveLegacyTarget(10)).toBe(10);
      expect(resolveLegacyTarget(100)).toBe(100);
    });
  });

  describe("convertLegacyContribution — legacy target 10", () => {
    it.each([
      [0, 0],
      [3, 30],
      [5, 50],
      [10, 100],
      [15, 150],
    ])("value %s -> %s", (oldValue, expected) => {
      expect(convertLegacyContribution(oldValue, 10)).toBe(expected);
    });

    it("does not convert zero or negative values", () => {
      expect(convertLegacyContribution(0, 10)).toBe(0);
      expect(convertLegacyContribution(-3, 10)).toBe(-3);
    });
  });

  describe("decideMigrationAction", () => {
    const baseAudit = {
      settingsCount: 1,
      distinctTargets: 1,
      negativeProductCount: 0,
      positiveProductCount: 0,
    };

    it("converts when legacy target is 10 with positive products", () => {
      expect(
        decideMigrationAction(10, {
          ...baseAudit,
          positiveProductCount: 5,
        }),
      ).toEqual({ action: "convert", resolvedTarget: 10 });
    });

    it("allows settings-only update when target=100 and no positive products", () => {
      expect(decideMigrationAction(100, baseAudit)).toEqual({
        action: "settings_only",
        resolvedTarget: 100,
      });
    });

    it("fails closed when target=100 with positive products (ambiguous)", () => {
      const result = decideMigrationAction(100, {
        ...baseAudit,
        positiveProductCount: 3,
      });
      expect(result.action).toBe("blocked");
      expect(result.blockReason).toBe("ambiguous_target_100");
      expect(result.blockMessage).toMatch(/ambiguous/i);
    });

    it("blocks when no Settings rows exist", () => {
      const result = decideMigrationAction(10, {
        ...baseAudit,
        settingsCount: 0,
      });
      expect(result.blockReason).toBe("no_settings");
    });

    it("blocks when Settings targets conflict", () => {
      const result = decideMigrationAction(10, {
        ...baseAudit,
        distinctTargets: 2,
      });
      expect(result.blockReason).toBe("conflicting_targets");
    });

    it("blocks negative Settings target", () => {
      const result = decideMigrationAction(-5, baseAudit);
      expect(result.blockReason).toBe("negative_target");
    });

    it("blocks negative product values", () => {
      const result = decideMigrationAction(10, {
        ...baseAudit,
        negativeProductCount: 1,
      });
      expect(result.blockReason).toBe("negative_products");
    });

    it("treats NULL target as legacy default 10 for conversion", () => {
      expect(
        decideMigrationAction(null, {
          ...baseAudit,
          positiveProductCount: 2,
        }),
      ).toEqual({ action: "convert", resolvedTarget: LEGACY_DEFAULT_TARGET });
    });

    it("treats zero target as legacy default 10 for conversion", () => {
      expect(
        decideMigrationAction(0, {
          ...baseAudit,
          positiveProductCount: 1,
        }),
      ).toEqual({ action: "convert", resolvedTarget: LEGACY_DEFAULT_TARGET });
    });

    it("blocks re-run after successful conversion (target=100 + positive products)", () => {
      const result = decideMigrationAction(100, {
        ...baseAudit,
        positiveProductCount: 1,
      });
      expect(result.action).toBe("blocked");
      expect(result.blockReason).toBe("ambiguous_target_100");
    });
  });

  describe("post-migration runtime semantics (unchanged by H5)", () => {
    it.each([
      [94.99, false],
      [95, true],
      [99.99, true],
      [100, true],
      [120, true],
      [250, true],
    ])("rawProgress %s eligible=%s at 95%% threshold", (raw, eligible) => {
      expect(raw >= 95).toBe(eligible);
    });

    it.each([
      [120, 100],
      [250, 100],
      [95, 95],
    ])("displayProgress min(raw,100): %s -> %s", (raw, display) => {
      expect(Math.min(raw, 100)).toBe(display);
    });
  });

  describe("migration SQL static guard", () => {
    it("does not mutate Order or OrderItem", () => {
      const sql = readFileSync(
        join(
          __dirname,
          "../../../prisma/migrations/20250905100000_free_delivery_percentage_model/migration.sql",
        ),
        "utf8",
      );
      expect(migrationSqlTouchesOrders(sql)).toBe(false);
      expect(sql).not.toMatch(/UPDATE\s+"Order"/i);
      expect(sql).not.toMatch(/UPDATE\s+"OrderItem"/i);
    });
  });
});
