-- Phase H3/H5: Convert legacy scooter-unit contributions to percentage scale.
--
-- Legacy model:
--   freeDeliveryValue = absolute contribution units (commonly compared to target 10)
--   freeDeliveryTarget = configurable target (commonly 10)
--
-- New model:
--   freeDeliveryValue = percentage contribution per unit
--   freeDeliveryTarget = 100
--   eligibility threshold = 95 (enforced in application code, not this migration)
--
-- Conversion (when unambiguous):
--   newPercent = ROUND((oldValue / oldTarget) * 100, 2)
--
-- Order, OrderItem, and all historical order snapshots are intentionally NOT modified.
-- Ambiguous legacy states fail closed rather than guess.

DO $$
DECLARE
  settings_count INTEGER;
  distinct_targets INTEGER;
  old_target NUMERIC;
  negative_product_count INTEGER;
  positive_product_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO settings_count FROM "Settings";

  IF settings_count = 0 THEN
    RAISE EXCEPTION
      'Free-delivery data migration blocked: no Settings row found.';
  END IF;

  SELECT COUNT(DISTINCT "freeDeliveryTarget") INTO distinct_targets FROM "Settings";

  IF distinct_targets > 1 THEN
    RAISE EXCEPTION
      'Free-delivery data migration blocked: multiple Settings rows with conflicting freeDeliveryTarget values. Resolve manually after read-only audit.';
  END IF;

  SELECT "freeDeliveryTarget" INTO old_target
  FROM "Settings"
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF old_target IS NULL OR old_target = 0 THEN
    -- Documented legacy default when target was unset or zero in early deployments.
    old_target := 10;
  ELSIF old_target < 0 THEN
    RAISE EXCEPTION
      'Free-delivery data migration blocked: Settings.freeDeliveryTarget is negative. Resolve manually before migration.';
  END IF;

  SELECT COUNT(*) INTO negative_product_count
  FROM "Product"
  WHERE "freeDeliveryValue" < 0;

  IF negative_product_count > 0 THEN
    RAISE EXCEPTION
      'Free-delivery data migration blocked: % product(s) have negative freeDeliveryValue. Resolve manually before migration.',
      negative_product_count;
  END IF;

  SELECT COUNT(*) INTO positive_product_count
  FROM "Product"
  WHERE "freeDeliveryValue" > 0;

  IF old_target = 100 THEN
    IF positive_product_count > 0 THEN
      RAISE EXCEPTION
        'Free-delivery data migration is ambiguous: legacy target=100 with % product(s) having positive freeDeliveryValue. Legacy values may be absolute units or already-percentages. Perform the required read-only audit and resolve the data state before applying the migration.',
        positive_product_count;
    END IF;
    -- Percentage-era DB or no product contributions: settings-only update below.
  ELSE
    UPDATE "Product"
    SET "freeDeliveryValue" = ROUND(("freeDeliveryValue" / old_target) * 100, 2)
    WHERE "freeDeliveryValue" > 0;
  END IF;

  -- All Settings rows share the same target (verified above); normalize every row.
  UPDATE "Settings"
  SET
    "freeDeliveryTarget" = 100,
    "partialFreeDeliveryEnabled" = false;
END $$;
