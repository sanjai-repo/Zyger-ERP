--
-- V20__return_and_allotment_frs_prefixes.sql
-- Return Management FRS v1.0 §8 + Stock Allotment & Adjustment FRS v1.0 §10
--
-- Canonicalizes the numbering prefixes for the 7 Return / Allotment / Adjustment
-- document types to their FRS values:
--   dc-return                  DRT   -> DCRET
--   invoice-return             IVT   -> INVRET
--   internal-return            IRN   -> STKRET   (Internal Return is now Stock Return)
--   stock-allotment            SA    -> STKALT
--   stock-release              SR    -> STKREL
--   stock-amendment            SAM   -> STKAMD
--   physical-stock-amendment   PSA   -> PHYAMD
--
-- The doc_type key for the FRS "Stock Return" keeps the legacy numbering_config
-- row key `internal-return` (the physical table is unchanged); the prefix is what
-- the FRS mandates.  DocNumberService.resolvePrefix() prefers numbering_config
-- over the DocTypes fallback, so these rows are the runtime source of truth; the
-- DocTypes fallback now carries the same new prefixes for consistency.
--
-- SAFETY:
--   - Updates only well-known rows, keyed on the unique doc_type column.
--   - Existing issued numbers are NOT renumbered; only the prefix for future
--     allocations changes.
--   - No DDL, no table drop.
--
UPDATE public.numbering_config SET prefix = 'DCRET' WHERE doc_type = 'dc-return'              AND prefix = 'DRT';
UPDATE public.numbering_config SET prefix = 'INVRET' WHERE doc_type = 'invoice-return'        AND prefix = 'IVT';
UPDATE public.numbering_config SET prefix = 'STKRET' WHERE doc_type = 'internal-return'       AND prefix = 'IRN';
UPDATE public.numbering_config SET prefix = 'STKALT' WHERE doc_type = 'stock-allotment'       AND prefix = 'SA';
UPDATE public.numbering_config SET prefix = 'STKREL' WHERE doc_type = 'stock-release'         AND prefix = 'SR';
UPDATE public.numbering_config SET prefix = 'STKAMD' WHERE doc_type = 'stock-amendment'       AND prefix = 'SAM';
UPDATE public.numbering_config SET prefix = 'PHYAMD' WHERE doc_type = 'physical-stock-amendment' AND prefix = 'PSA';
