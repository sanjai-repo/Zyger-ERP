--
-- V8__production_disposition_documents.sql
-- P9 — Rejection / Scrap / Rework first-class disposition documents
-- (ADR-PROD-003 CREATE NEW first-class docs; ADR-PROD-004 numbering registration;
--  CLAR-PROD-002 R1 rejected-split via disposition docs; CLAR-PROD-005 rework-route;
--  CLAR-PROD-011 batch identity for batch/lot-controlled items only;
--  CLAR-PROD-003 + D-C1 strict disposition, never FREE).
--
-- SCOPE: Additive only. Three new first-class document families
--   + lines, a disposition-posting idempotency table, a disposition audit log,
--   and numbering_config seeds (REJ / SC / PER per FRS DOC_07 §21.2).
--   No destructive change, no data deletion, no alteration of Production Entry,
--   WIP, subjob, normalized-event, or Inventory tables.
--
-- INVARIANTS PRESERVED (enforced by the application layer, asserted by tests):
--   * disposition documents NEVER modify production_entry quantities,
--     WIP (`prod_execution_session.wip`), produced/pending, subjob roll-ups,
--     normalized events, or stock_ledger / stock_balance; they CLASSIFY the
--     already-reported rejected/scrap/rework totals (R1).
--   * a document is only creatable/postable against a POSTED, non-reversed entry.
--   * quantity > 0 per line; sum(lines) <= the referenced entry's bucket
--     (rejected / scrap / rework).
--   * unknown disposition => validation error (never FREE).
--
SET search_path TO public;

-- ---------------------------------------------------------------------------
-- 1. Rejection / Defect Record (NUM-PROD-REJ, REJ-{PLANT}-{FY}-{SEQ})
-- ---------------------------------------------------------------------------
CREATE TABLE production_rejection_doc (
    id                  BIGSERIAL PRIMARY KEY,
    doc_number          VARCHAR(80) NOT NULL UNIQUE,
    entry_id            BIGINT NOT NULL REFERENCES production_entry (id),
    entry_number        VARCHAR(80) NOT NULL,
    job_card_number     VARCHAR(80),
    subjob_number       VARCHAR(80),
    operation_code      VARCHAR(80),
    part_code           VARCHAR(60),
    part_description    VARCHAR(200),
    inspection_date     DATE,
    inspector           VARCHAR(80),
    ncr_number          VARCHAR(80),
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    reversal_reason     VARCHAR(255),
    reversed_from_doc_id BIGINT,
    is_reversal         BOOLEAN NOT NULL DEFAULT FALSE,
    remarks             VARCHAR(500),
    created_by          VARCHAR(80),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by          VARCHAR(80),
    updated_at          TIMESTAMPTZ,
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE production_rejection_line (
    id                 BIGSERIAL PRIMARY KEY,
    rejection_doc_id   BIGINT NOT NULL REFERENCES production_rejection_doc (id) ON DELETE CASCADE,
    line_no            INTEGER NOT NULL,
    item_code          VARCHAR(60) NOT NULL,
    item_name          VARCHAR(200),
    quantity           NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    uom                VARCHAR(20),
    reason_code        VARCHAR(60) NOT NULL,
    reason_description VARCHAR(255),
    disposition        VARCHAR(30) NOT NULL,
    batch_number       VARCHAR(60),
    location           VARCHAR(60) DEFAULT 'STORE',
    remarks            VARCHAR(500),
    UNIQUE (rejection_doc_id, line_no)
);

CREATE INDEX idx_rejection_line_doc ON production_rejection_line (rejection_doc_id);
CREATE INDEX idx_rejection_doc_entry ON production_rejection_doc (entry_id);
CREATE INDEX idx_rejection_doc_status ON production_rejection_doc (status);

-- ---------------------------------------------------------------------------
-- 2. Scrap document (NUM-PROD-SCRAP, SC-{PLANT}-{FY}-{SEQ})
-- ---------------------------------------------------------------------------
CREATE TABLE production_scrap_doc (
    id                  BIGSERIAL PRIMARY KEY,
    doc_number          VARCHAR(80) NOT NULL UNIQUE,
    entry_id            BIGINT NOT NULL REFERENCES production_entry (id),
    entry_number        VARCHAR(80) NOT NULL,
    job_card_number     VARCHAR(80),
    subjob_number       VARCHAR(80),
    operation_code      VARCHAR(80),
    part_code           VARCHAR(60),
    part_description    VARCHAR(200),
    scrap_date          DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    reversal_reason     VARCHAR(255),
    reversed_from_doc_id BIGINT,
    is_reversal         BOOLEAN NOT NULL DEFAULT FALSE,
    remarks             VARCHAR(500),
    created_by          VARCHAR(80),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by          VARCHAR(80),
    updated_at          TIMESTAMPTZ,
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE production_scrap_line (
    id                 BIGSERIAL PRIMARY KEY,
    scrap_doc_id       BIGINT NOT NULL REFERENCES production_scrap_doc (id) ON DELETE CASCADE,
    line_no            INTEGER NOT NULL,
    item_code          VARCHAR(60) NOT NULL,
    item_name          VARCHAR(200),
    quantity           NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    uom                VARCHAR(20),
    reason_code        VARCHAR(60) NOT NULL,
    reason_description VARCHAR(255),
    disposition        VARCHAR(30) NOT NULL,
    batch_number       VARCHAR(60),
    warehouse          VARCHAR(60) DEFAULT 'STORE',
    location           VARCHAR(60) DEFAULT 'STORE',
    remarks            VARCHAR(500),
    UNIQUE (scrap_doc_id, line_no)
);

CREATE INDEX idx_scrap_line_doc ON production_scrap_line (scrap_doc_id);
CREATE INDEX idx_scrap_doc_entry ON production_scrap_doc (entry_id);
CREATE INDEX idx_scrap_doc_status ON production_scrap_doc (status);

-- ---------------------------------------------------------------------------
-- 3. Rework document (NUM-PROD-ENTRY-REWORK, PER-{PLANT}-{FY}-{SEQ})
-- ---------------------------------------------------------------------------
CREATE TABLE production_rework_doc (
    id                  BIGSERIAL PRIMARY KEY,
    doc_number          VARCHAR(80) NOT NULL UNIQUE,
    entry_id            BIGINT NOT NULL REFERENCES production_entry (id),
    entry_number        VARCHAR(80) NOT NULL,
    job_card_number     VARCHAR(80),
    subjob_number       VARCHAR(80),
    operation_code      VARCHAR(80),
    part_code           VARCHAR(60),
    part_description    VARCHAR(200),
    rework_date         DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    reversal_reason     VARCHAR(255),
    reversed_from_doc_id BIGINT,
    is_reversal         BOOLEAN NOT NULL DEFAULT FALSE,
    remarks             VARCHAR(500),
    created_by          VARCHAR(80),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by          VARCHAR(80),
    updated_at          TIMESTAMPTZ,
    version             BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE production_rework_line (
    id                    BIGSERIAL PRIMARY KEY,
    rework_doc_id         BIGINT NOT NULL REFERENCES production_rework_doc (id) ON DELETE CASCADE,
    line_no               INTEGER NOT NULL,
    item_code             VARCHAR(60) NOT NULL,
    item_name             VARCHAR(200),
    quantity              NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    uom                   VARCHAR(20),
    reason_code           VARCHAR(60) NOT NULL,
    reason_description    VARCHAR(255),
    source_operation_code VARCHAR(80),
    target_operation_code VARCHAR(80),
    ncr_number            VARCHAR(80),
    authorization_number  VARCHAR(80),
    batch_number          VARCHAR(60),
    remarks               VARCHAR(500),
    UNIQUE (rework_doc_id, line_no)
);

CREATE INDEX idx_rework_line_doc ON production_rework_line (rework_doc_id);
CREATE INDEX idx_rework_doc_entry ON production_rework_doc (entry_id);
CREATE INDEX idx_rework_doc_status ON production_rework_doc (status);

-- ---------------------------------------------------------------------------
-- 4. Disposition-posting idempotency keys (X-Idempotency-Key mechanism)
-- ---------------------------------------------------------------------------
CREATE TABLE production_doc_posting_key (
    idempotency_key  VARCHAR(100) PRIMARY KEY,
    doc_family       VARCHAR(20) NOT NULL,
    doc_id           BIGINT NOT NULL,
    result_status    VARCHAR(15) NOT NULL,
    response_json    TEXT,
    created_at       TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_doc_posting_key_doc ON production_doc_posting_key (doc_family, doc_id);

-- ---------------------------------------------------------------------------
-- 5. Disposition document audit log
-- ---------------------------------------------------------------------------
CREATE TABLE production_disposition_audit_log (
    id           BIGSERIAL PRIMARY KEY,
    doc_family   VARCHAR(20) NOT NULL,
    doc_id       BIGINT NOT NULL,
    doc_number   VARCHAR(80),
    event_type   VARCHAR(30) NOT NULL,
    user_id      VARCHAR(80),
    timestamp    TIMESTAMPTZ NOT NULL,
    metadata_json TEXT
);
CREATE INDEX idx_disposition_audit_doc ON production_disposition_audit_log (doc_family, doc_id);

-- ---------------------------------------------------------------------------
-- 6. Numbering registration (ADR-PROD-004 / FRS DOC_07 §21.2)
-- ---------------------------------------------------------------------------
INSERT INTO public.numbering_config
    (active, doc_type, fy_start_month, prefix, reset_per_year, separator,
     use_fy_segment, use_plant_segment, zero_pad)
VALUES
    (true, 'rejection-document', 4, 'REJ', true, '-', true, true, 6),
    (true, 'scrap-document',      4, 'SC',  true, '-', true, true, 6),
    (true, 'rework-document',     4, 'PER', true, '-', true, true, 6)
ON CONFLICT (doc_type) DO NOTHING;