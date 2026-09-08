--
-- V17__numbering_config_inventory_seed.sql
-- DOCUMENT 02 v2.0 (Inventory FRS) — §15 Numbering (NUM-INV)
--
-- SCOPE: Seed every Inventory document type into numbering_config (rows only).
--        No DDL. No table drop. Idempotency-safe.
--
-- PURPOSE:
--   DocNumberService.resolvePrefix() consults numbering_config BEFORE the
--   DocTypes fallback, so these rows:
--     1) make each Inventory prefix configurable per company (NumberingConfig
--        admin screen) without a code change, and
--     2) register the corrected prefixes from §15 / BR-INV-NUM-1:
--        * internal-return          -> IRN  (was 'INT' — collided with
--                                             issue-internal-external internal leg)
--        * issue-internal-external  -> IIE  stable default; the per-leg prefixes
--                                             ISI (internal) / EXT (external) are
--                                             applied at allocation time via the
--                                             explicit-prefix path, which bypasses
--                                             numbering_config by design.
--
-- FORMAT & MAPPING:
--   doc_type (stable key, unchanged) | FRS §15 prefix (seeded)
--   po-inward POI | lo-inward LOI | jo-inward JOI | general-inward GI
--   return-inward RI | grn GRN | stock-issue-request SIR | rm-issue RMI
--   general-issue GEI | jo-dc-issue JDI | issue-internal-external IIE
--   issue-against-receipt IAR | sales-dc SDC | jo-dc JOD | general-dc GDC
--   return-dc RDC | transfer-dc TDC | purchase-invoice PI | subcontract-invoice SI
--   inward-return IRT | dc-return DRT | invoice-return IVT | internal-return IRN
--   received-against-issue RAI | receipt-return RCT | stock-allotment SA
--   stock-release SR | stock-amendment SAM | physical-stock-amendment PSA
--
--   The doc_type keys match the keys already used by DocumentController /
--   DocumentFacade / DocTypes today. The seeded prefix is the FRS canonical value
--   (the config engine uppercases it).
--
-- SAFETY:
--   - Unique (doc_type) constraint guarantees ON CONFLICT idempotency.
--   - no foreign keys on numbering_config.
--   - every NOT NULL column supplied (doc_type, prefix, zero_pad, reset_per_year,
--     separator, active); nullable FY/plant/separator columns explicit.
--   - financial year = Indian April-start (fy_start_month = 4) per entity default.

INSERT INTO public.numbering_config
    (active, doc_type, fy_start_month, prefix, reset_per_year, separator,
     use_fy_segment, use_plant_segment, zero_pad)
VALUES
    (true, 'po-inward',                4, 'POI', true, '-', true, true, 6),
    (true, 'lo-inward',                4, 'LOI', true, '-', true, true, 6),
    (true, 'jo-inward',                4, 'JOI', true, '-', true, true, 6),
    (true, 'general-inward',           4, 'GI',  true, '-', true, true, 6),
    (true, 'return-inward',            4, 'RI',  true, '-', true, true, 6),
    (true, 'grn',                      4, 'GRN', true, '-', true, true, 6),
    (true, 'stock-issue-request',      4, 'SIR', true, '-', true, true, 6),
    (true, 'rm-issue',                 4, 'RMI', true, '-', true, true, 6),
    (true, 'general-issue',            4, 'GEI', true, '-', true, true, 6),
    (true, 'jo-dc-issue',              4, 'JDI', true, '-', true, true, 6),
    (true, 'issue-internal-external',  4, 'IIE', true, '-', true, true, 6),
    (true, 'issue-against-receipt',    4, 'IAR', true, '-', true, true, 6),
    (true, 'sales-dc',                 4, 'SDC', true, '-', true, true, 6),
    (true, 'jo-dc',                    4, 'JOD', true, '-', true, true, 6),
    (true, 'general-dc',               4, 'GDC', true, '-', true, true, 6),
    (true, 'return-dc',                4, 'RDC', true, '-', true, true, 6),
    (true, 'transfer-dc',              4, 'TDC', true, '-', true, true, 6),
    (true, 'purchase-invoice',         4, 'PI',  true, '-', true, true, 6),
    (true, 'subcontract-invoice',      4, 'SI',  true, '-', true, true, 6),
    (true, 'inward-return',            4, 'IRT', true, '-', true, true, 6),
    (true, 'dc-return',                4, 'DRT', true, '-', true, true, 6),
    (true, 'invoice-return',           4, 'IVT', true, '-', true, true, 6),
    (true, 'internal-return',          4, 'IRN', true, '-', true, true, 6),
    (true, 'received-against-issue',   4, 'RAI', true, '-', true, true, 6),
    (true, 'receipt-return',           4, 'RCT', true, '-', true, true, 6),
    (true, 'stock-allotment',          4, 'SA',  true, '-', true, true, 6),
    (true, 'stock-release',            4, 'SR',  true, '-', true, true, 6),
    (true, 'stock-amendment',          4, 'SAM', true, '-', true, true, 6),
    (true, 'physical-stock-amendment', 4, 'PSA', true, '-', true, true, 6)
ON CONFLICT (doc_type) DO NOTHING;