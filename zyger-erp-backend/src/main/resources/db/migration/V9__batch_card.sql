--
-- V9__batch_card.sql
-- P10 — Batch Card & Batch Identity (DOCUMENT_60)
-- CLAR-PROD-011 batch/lot dimensions + manual allocation; Batch Card = DOCUMENT (DOC_57);
-- ADR-PROD-004 numbering registration; ADR-PROD-005 Inventory boundary preserved.
--
-- SCOPE: Additive only. Three new tables (card + allocation + audit log),
--   numbering_config seed (BC), and unique indexes.
--   NO modification to production_entry, production_entry_batch, prod_output_event,
--   prod_execution_session, stock_ledger, stock_balance, or any existing table.
--
-- INVARIANTS:
--   * Batch Card NEVER modifies production_entry quantities, WIP, subjob roll-ups,
--     normalized events, or stock_ledger / stock_balance. RECORDING-ONLY.
--   * quantity <> 0 per header/line (DB CHECK); sign enforced by application service:
--     positive for normal cards, negative for reversal mirrors.
--   * one non-reversal card per (entry, physical batch) enforced by unique index.
--   * one allocation per physical batch per card enforced by unique index.
--
SET search_path TO public;

-- ---------------------------------------------------------------------------
-- 1. Batch Card header (NUM-PROD-BATCH, BC-{FY}-{SEQ})
-- ---------------------------------------------------------------------------
CREATE TABLE production_batch_card (
    id                      BIGSERIAL PRIMARY KEY,
    doc_number              VARCHAR(80) NOT NULL UNIQUE,
    physical_batch_number   VARCHAR(60),
    lot_number              VARCHAR(60),
    heat_number             VARCHAR(60),
    item_code               VARCHAR(60),
    item_name               VARCHAR(200),
    uom                     VARCHAR(20),
    quantity                NUMERIC(18,4) NOT NULL CHECK (quantity <> 0),
    entry_id                BIGINT NOT NULL REFERENCES production_entry (id),
    entry_number            VARCHAR(80) NOT NULL,
    job_card_number         VARCHAR(80),
    subjob_number           VARCHAR(80),
    operation_code          VARCHAR(80),
    status                  VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    reversal_reason         VARCHAR(255),
    reversed_from_doc_id    BIGINT,
    is_reversal             BOOLEAN NOT NULL DEFAULT FALSE,
    remarks                 VARCHAR(500),
    created_by              VARCHAR(80),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by              VARCHAR(80),
    updated_at              TIMESTAMPTZ,
    version                 BIGINT NOT NULL DEFAULT 0
);

-- One non-reversal card per (entry, physical batch) — prevents duplicate cards
CREATE UNIQUE INDEX uq_batch_card_entry_batch
    ON production_batch_card (entry_id, physical_batch_number)
    WHERE NOT is_reversal;

CREATE INDEX idx_batch_card_entry ON production_batch_card (entry_id);
CREATE INDEX idx_batch_card_status ON production_batch_card (status);
CREATE INDEX idx_batch_card_item   ON production_batch_card (entry_id, item_code);

-- ---------------------------------------------------------------------------
-- 2. Batch Card allocation lines
-- ---------------------------------------------------------------------------
CREATE TABLE production_batch_card_allocation (
    id                 BIGSERIAL PRIMARY KEY,
    batch_card_id      BIGINT NOT NULL REFERENCES production_batch_card (id) ON DELETE CASCADE,
    line_no            INTEGER NOT NULL,
    batch_number       VARCHAR(60) NOT NULL,
    lot_number         VARCHAR(60),
    heat_number        VARCHAR(60),
    quantity           NUMERIC(18,4) NOT NULL CHECK (quantity <> 0),
    location           VARCHAR(60) DEFAULT 'STORE',
    remarks            VARCHAR(500),
    UNIQUE (batch_card_id, line_no),
    UNIQUE (batch_card_id, batch_number)
);

CREATE INDEX idx_batch_alloc_card ON production_batch_card_allocation (batch_card_id);

-- ---------------------------------------------------------------------------
-- 3. Batch Card audit log
-- ---------------------------------------------------------------------------
CREATE TABLE production_batch_card_audit_log (
    id           BIGSERIAL PRIMARY KEY,
    doc_id       BIGINT NOT NULL,
    doc_number   VARCHAR(80),
    event_type   VARCHAR(30) NOT NULL,
    user_id      VARCHAR(80),
    timestamp    TIMESTAMPTZ NOT NULL,
    metadata_json TEXT
);
CREATE INDEX idx_batch_card_audit_doc ON production_batch_card_audit_log (doc_id);

-- ---------------------------------------------------------------------------
-- 4. Numbering registration (ADR-PROD-004 / FRS DOC_07 §21.2)
-- ---------------------------------------------------------------------------
INSERT INTO public.numbering_config
    (active, doc_type, fy_start_month, prefix, reset_per_year, separator,
     use_fy_segment, use_plant_segment, zero_pad)
VALUES
    (true, 'batch-card', 4, 'BC', true, '-', true, true, 6)
ON CONFLICT (doc_type) DO NOTHING;
