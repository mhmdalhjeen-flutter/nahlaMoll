-- Simple numeric customer-facing order numbers (e.g. 10254).
-- Historical ORD-* values are preserved; new orders use this sequence.
-- Application query: SELECT nextval('"Order_number_seq"')

CREATE SEQUENCE IF NOT EXISTS "Order_number_seq";

DO $$
DECLARE
  max_numeric BIGINT;
  sequence_floor CONSTANT BIGINT := 10000;
BEGIN
  SELECT MAX(CAST("orderNumber" AS BIGINT))
  INTO max_numeric
  FROM "Order"
  WHERE "orderNumber" ~ '^[0-9]+$';

  IF max_numeric IS NULL THEN
    -- Fresh numeric numbering: first nextval() returns 10001.
    PERFORM setval('"Order_number_seq"', sequence_floor, true);
  ELSE
    -- Continue after the highest existing numeric customer-facing number.
    PERFORM setval('"Order_number_seq"', GREATEST(max_numeric, sequence_floor), true);
  END IF;
END $$;
