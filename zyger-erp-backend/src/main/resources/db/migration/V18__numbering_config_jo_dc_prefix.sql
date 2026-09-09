--
-- V18__numbering_config_jo_dc_prefix.sql
-- DC Module FRS v1.0 — §8 Numbering Series
--
-- The seeded jo-dc prefix in V17 was 'JOD', but the FRS (and the DocTypes
-- fallback and DeliveryChallanIntegrationTest) all use 'JODC' for Job Order DC.
-- Since DocNumberService.resolvePrefix() prefers numbering_config over the
-- DocTypes fallback, the 'JOD' row was winning at runtime, producing
-- JOD-2026-xxxxx numbers instead of JODC-2026-xxxxx.
--
-- This migration corrects the active jo-dc config row to 'JODC'. Idempotent:
-- it only touches the jo-dc row and only when it still carries the stale 'JOD'.
-- Other DC prefixes (GDC / TDC / SDC / RDC) were already correct.
--
-- SAFETY:
--   - Updates only the well-known jo-dc row (unique on doc_type).
--   - Existing issued numbers are NOT renumbered; only the prefix for future
--     allocations changes.
--   - No DDL, no table drop.

UPDATE public.numbering_config
   SET prefix = 'JODC'
 WHERE doc_type = 'jo-dc'
   AND prefix = 'JOD';