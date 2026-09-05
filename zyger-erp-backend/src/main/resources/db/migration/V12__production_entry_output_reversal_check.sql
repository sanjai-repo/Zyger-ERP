--
-- V12__production_entry_output_reversal_check.sql
-- P14-R1 / F1 (DOCUMENT_64 F1) — V7 quantity CHECK vs P8 reversal rows.
--
-- Root cause: V7 declared `CHECK (quantity > 0)` on production_entry_output,
-- but the approved P8 reversal representation (DOCUMENT_58 / DOCUMENT_64 §22)
-- mirrors additional co/by-product outputs as NEGATED rows on the reversal
-- entry (ProductionController reverse block: quantity().negate()). The positive
-- CHECK therefore makes every reversal of an entry with co/by-product outputs
-- violate the schema on Flyway-managed databases. Dev/test never hit it because
-- the default profile disables Flyway and the schema is Hibernate-derived
-- (Hibernate emits no CHECK).
--
-- Fix chosen: align the DB constraint to the approved persisted model —
-- quantity must be NON-ZERO, sign is the application's reversal representation.
-- This matches the precedent already used for P10 batch cards (V9:
-- `quantity NUMERIC(18,4) NOT NULL CHECK (quantity <> 0)`, where negative rows
-- are reversal mirrors). Originals stay positive, reversal mirrors negative, and
-- zero-quantity facts remain rejected. No business-model or behavior change;
-- existing positive rows satisfy the new check (`<> 0`).
--
-- SAFETY: non-destructive constraint swap on an existing table only; no data
-- change (no DROP/TRUNCATE/DELETE), idempotent guard for partially-created
-- databases (constraint name is unique and created once).
--
SET search_path TO public;

ALTER TABLE production_entry_output
    DROP CONSTRAINT IF EXISTS ck_production_entry_output_qty_positive;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_production_entry_output_qty_nonzero'
          AND conrelid = 'production_entry_output'::regclass
    ) THEN
        ALTER TABLE production_entry_output
            ADD CONSTRAINT ck_production_entry_output_qty_nonzero
            CHECK (quantity <> 0);
    END IF;
END $$;