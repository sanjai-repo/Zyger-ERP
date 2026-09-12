--
-- V2__numbering_config_production_seed.sql
-- P1 — Database & Entity Foundation (DOC 18 PHASE P1; ADR-PROD-004)
--
-- SCOPE: Seed Production document types into numbering_config (rows only).
--        No DDL. No table drop. No column drop. Idempotency-safe.
--
-- PURPOSE:
--   ADR-PROD-004 (D4) = REUSE DocNumberService + doc_sequence + numbering_config.
--   These rows register the Production doc-types so that DocNumberService may
--   issue them via the plant/FY-aware configurable path
--   `nextNumberFromConfig(docType, plantId)` per DOC 07 §21.2
--   (format `{PREFIX}-{PLANT}-{FY}-{SEQ}`).
--
-- DORMANT IN P1:
--   This file only adds configuration. No Production code reads it yet, so it
--   cannot alter current runtime numbering. It becomes authoritative when
--   Production adopts the config-aware numbering path in later phases (P2+).
--
-- FORMAT & MAPPING (DOC 07 §21.2 canonical vs existing legacy):
--   doc_type (stable key, unchanged) | FRS prefix (seeded) | legacy prefix (code)
--   job-card                          | JC                  | JCF
--   production-entry                  | PE                  | PE
--   product-conversion                | CV                  | PC
--   production-return                 | PR                  | PR
--   production-log-sheet              | PL                  | PLS
--   idle-time-entry                   | ID                  | ITE
--
--   The doc_type keys are NOT invented; they match the keys already used by
--   ProductionController and DocNumberService today. Only the configurable PREFIX
--   is seeded to the FRS canonical value (the config engine uppercases it).
--
-- SAFETY:
--   - Unique (doc_type) constraint guarantees ON CONFLICT idempotency.
--   - no foreign keys on numbering_config (verified against consolidated baseline).
--   - every NOT NULL column supplied (id, active, doc_type, prefix,
--     reset_per_year, zero_pad); nullable FY/plant/separator columns explicit.
--   - financial year = Indian April-start (fy_start_month = 4) per entity default
--     and FinancialYear helper.
--
-- This migration is validated against a disposable PostgreSQL container with
-- Flyway enabled before staging (GATE 4 of P1 pre-implementation verification).

INSERT INTO public.numbering_config
    (active, doc_type, fy_start_month, prefix, reset_per_year, separator,
     use_fy_segment, use_plant_segment, zero_pad)
VALUES
    (true, 'job-card',             4, 'JC', true, '-', true, true, 6),
    (true, 'production-entry',     4, 'PE', true, '-', true, true, 6),
    (true, 'product-conversion',   4, 'CV', true, '-', true, true, 6),
    (true, 'production-return',    4, 'PR', true, '-', true, true, 6),
    (true, 'production-log-sheet', 4, 'PL', true, '-', true, true, 6),
    (true, 'idle-time-entry',      4, 'ID', true, '-', true, true, 6)
ON CONFLICT (doc_type) DO NOTHING;