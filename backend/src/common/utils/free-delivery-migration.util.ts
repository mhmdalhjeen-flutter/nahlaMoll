/**
 * Pure decision logic mirrored by the H3/H5 SQL migration.
 * Used for unit tests only — the authoritative conversion runs in migration.sql.
 */

export const LEGACY_DEFAULT_TARGET = 10;
export const PERCENTAGE_ERA_TARGET = 100;

export type MigrationProductAction = "convert" | "settings_only" | "blocked";

export type MigrationBlockReason =
  | "no_settings"
  | "conflicting_targets"
  | "negative_target"
  | "negative_products"
  | "ambiguous_target_100";

export interface MigrationDecision {
  action: MigrationProductAction;
  resolvedTarget: number | null;
  blockReason?: MigrationBlockReason;
  blockMessage?: string;
}

export interface MigrationAuditCounts {
  settingsCount: number;
  distinctTargets: number;
  negativeProductCount: number;
  positiveProductCount: number;
}

/** Resolve raw Settings.freeDeliveryTarget for migration divisor purposes. */
export function resolveLegacyTarget(
  rawTarget: number | null | undefined,
): number {
  if (rawTarget == null || rawTarget === 0) {
    return LEGACY_DEFAULT_TARGET;
  }
  return rawTarget;
}

/** Convert one legacy contribution value to percentage points (2 dp). */
export function convertLegacyContribution(
  oldValue: number,
  oldTarget: number,
): number {
  if (oldValue <= 0) {
    return oldValue;
  }
  if (oldTarget <= 0) {
    throw new Error("Division by zero or negative target is not allowed");
  }
  return Math.round((oldValue / oldTarget) * 100 * 100) / 100;
}

/**
 * Decide whether the migration may convert products, update settings only, or must fail.
 * Mirrors backend/prisma/migrations/20250905100000_free_delivery_percentage_model/migration.sql
 */
export function decideMigrationAction(
  rawTarget: number | null | undefined,
  audit: MigrationAuditCounts,
): MigrationDecision {
  if (audit.settingsCount === 0) {
    return blocked(
      "no_settings",
      "Free-delivery data migration blocked: no Settings row found.",
    );
  }

  if (audit.distinctTargets > 1) {
    return blocked(
      "conflicting_targets",
      "Free-delivery data migration blocked: multiple Settings rows with conflicting freeDeliveryTarget values. Resolve manually after read-only audit.",
    );
  }

  if (rawTarget != null && rawTarget < 0) {
    return blocked(
      "negative_target",
      "Free-delivery data migration blocked: Settings.freeDeliveryTarget is negative. Resolve manually before migration.",
    );
  }

  if (audit.negativeProductCount > 0) {
    return blocked(
      "negative_products",
      `Free-delivery data migration blocked: ${audit.negativeProductCount} product(s) have negative freeDeliveryValue. Resolve manually before migration.`,
    );
  }

  const resolvedTarget = resolveLegacyTarget(rawTarget);

  if (resolvedTarget === PERCENTAGE_ERA_TARGET) {
    if (audit.positiveProductCount > 0) {
      return blocked(
        "ambiguous_target_100",
        `Free-delivery data migration is ambiguous: legacy target=100 with ${audit.positiveProductCount} product(s) having positive freeDeliveryValue. Legacy values may be absolute units or already-percentages. Perform the required read-only audit and resolve the data state before applying the migration.`,
      );
    }
    return { action: "settings_only", resolvedTarget };
  }

  return { action: "convert", resolvedTarget };
}

function blocked(
  reason: MigrationBlockReason,
  message: string,
): MigrationDecision {
  return {
    action: "blocked",
    resolvedTarget: null,
    blockReason: reason,
    blockMessage: message,
  };
}

/** Whether migration SQL touches Order / OrderItem (static guard for tests). */
export function migrationSqlTouchesOrders(sql: string): boolean {
  const normalized = sql.replace(/--[^\n]*/g, " ").toLowerCase();
  const forbidden = [
    /\bupdate\s+"order"\b/,
    /\bupdate\s+"orderitem"\b/,
    /\bdelete\s+from\s+"order"\b/,
    /\bdelete\s+from\s+"orderitem"\b/,
  ];
  return forbidden.some((pattern) => pattern.test(normalized));
}
