--
-- V19__stock_ledger_leg_identity_tx_type.sql
-- DC Module FRS v1.0 — motorized stock movements
--
-- Context: V13 enforced a UNIQUE (doc_no, doc_type) on stock_ledger because every
-- document used a single stable identity key and StockService guarded with
-- existsByDocNoAndDocType(docNo, docType). That identity contract is too narrow for
-- Delivery Challans, whose posting is a multi-leg movement:
--
--   jo-dc "Sending":                OUT source (JO_DC)                     + IN "Goods with Job Worker" (JO_DC_SEND)
--   jo-dc "Receiving":              OUT "Goods with Job Worker" (JO_DC_RECEIPT) + IN source (JO_DC_RECEIPT_IN)
--   transfer-dc direct:             OUT source (TRANSFER_DC)               + IN destination (TRANSFER_IN)
--   transfer-dc in-transit post:    OUT source (TRANSFER_DC)               + IN "In-Transit" (TRANSFER_INTRANSIT_IN)
--   transfer-dc confirm receipt:    OUT "In-Transit" (TRANSFER_INTRANSIT_OUT)+ IN destination (TRANSFER_RECEIPT)
--
-- Under the (doc_no, doc_type) constraint every leg after the first was silently
-- dropped by the exists-guard (same pair), so virtual buckets ("Goods with Job
-- Worker", "In-Transit") could never be funded and transfer receipt never reached
-- the destination store. This migration widens the identity to
-- (doc_no, doc_type, tx_type): one row per distinct leg, while still guaranteeing
-- that re-posting the SAME leg is impossible.
--
-- SAFETY:
--   - V13 already proved (doc_no, doc_type) unique, so the wider key can never
--     have duplicates today; DROP old index then CREATE new is atomic-safe.
--   - Every StockService write supplies a non-NULL tx_type, and the Java guard was
--     widened to existsByDocNoAndDocTypeAndTxType in lockstep.
--   - NULL tx_type rows remain distinct under Postgres NULL semantics (unchanged).

DROP INDEX IF EXISTS public.uq_stock_ledger_doc_no_doc_type;
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_ledger_doc_no_doc_type_tx_type
    ON public.stock_ledger (doc_no, doc_type, tx_type);