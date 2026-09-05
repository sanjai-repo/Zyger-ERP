--
-- V13__stock_ledger_doc_identity_unique.sql
-- P14-R1 / F6 (DOCUMENT_64 F6) — stock_ledger (doc_no, doc_type) uniqueness.
--
-- Root cause: StockService makes every production stock movement idempotent via
-- `ledger.existsByDocNoAndDocType(docNo, docType)` — a CHECK-THEN-INSERT with no
-- DB-level guarantee. stock_ledger (V1) has only a PK and two non-unique indexes
-- (idx_ledger_doc, idx_ledger_item_loc), so two concurrent identical postings can
-- both pass the exists-check and double-post stock (_balance + _ledger). The
-- optimistic status guards (POST once per document) reduce, but do not eliminate,
-- the race at the movement layer.
--
-- Every production movement uses a STABLE document-identity key:
--   production-consumption  docNo = {consumptionNo}-{lineId},  docType = production-consumption
--   production-return       docNo = returnNumber,               docType = production-return
--   product-conversion      docNo = {conversionNo}-OUT / -IN,   docType = product-conversion
--   job-card-complete       docNo = jobCardNumber,              docType = job-card-complete
-- A full UNIQUE index on (doc_no, doc_type) implements the same contract that
-- existsByDocNoAndDocType already enforces, atomically. It cannot break any
-- legitimate multi-row flow: any two rows today sharing the same (doc_no, doc_type)
-- are already silently dropped by the exists-check (e.g. DocumentFacade posts one
-- per line), so no working flow writes such a pair.
--
-- SAFETY per authorization: detect pre-existing duplicates FIRST and STOP loudly
-- (no automated deletion). NULL doc_no/doc_type stay distinct (PostgreSQL
-- semantics), matching StockService, which always writes non-NULL keys.
--
SET search_path TO public;

DO $$
DECLARE
    dup_groups BIGINT;
    dup_count  BIGINT;
BEGIN
    SELECT COALESCE(SUM(c), 0), COUNT(*)
      INTO dup_count, dup_groups
      FROM (
        SELECT COUNT(*) AS c
          FROM stock_ledger
         WHERE doc_no IS NOT NULL AND doc_type IS NOT NULL
         GROUP BY doc_no, doc_type
        HAVING COUNT(*) > 1
      ) duplicates;

    IF dup_groups > 0 THEN
        RAISE EXCEPTION
            'P14-R1/F6 ABORT: % duplicate stock_ledger (doc_no, doc_type) groups detected (extra rows = %). '
            'Resolve the data condition manually before applying the unique index — duplicates are not auto-deleted.',
            dup_groups, dup_count;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_ledger_doc_no_doc_type
    ON stock_ledger (doc_no, doc_type);