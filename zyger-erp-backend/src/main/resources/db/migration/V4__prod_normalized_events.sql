-- ============================================================================
-- V4__prod_normalized_events.sql
-- P3 — Additive Normalized Operation-Event Projection (APPROVED SUBSET)
-- ----------------------------------------------------------------------------
-- Scope (approved DOCUMENT_24 §6 / DOCUMENT_25 P3-01..P3-10):
--   * prod_execution_session   (aggregate root; one per production_entry.entry_number)
--   * prod_operation_event     (one per session x subjob_number x operation_code x seq)
--   * prod_output_event        (one per session x operation_event x output_type x item x location)
--   * prod_backfill_progress   (marker table for the SEPARATELY-GATED backfill job — NOT executed here)
--
-- Mandatory rules honored:
--   * strictly additive  — no DROP, no RENAME, no column type change
--   * no NOT NULL on legacy tables; no change to production_entry*/job_card/work_order
--   * natural-key UNIQUE constraints for idempotent replay (P3-03)
--   * hard DB FKs only within the event model (session -> operation -> output)
--     for intra-P3 referential integrity; NO FK from session to legacy tables
--     (mirrors approved V3 decision: logical-only, service-enforced, replay-independent)
--   * idempotent (IF NOT EXISTS)
--   * events are DERIVED PROJECTIONS ONLY — never an independent transaction
--     authority (P3-01); never post inventory (P3-05)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- prod_execution_session — aggregate root, one per authoritative entry_number
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_execution_session (
    id                      BIGSERIAL PRIMARY KEY,
    entry_number            VARCHAR(60)  NOT NULL,
    job_card_number         VARCHAR(60),
    work_order_number       VARCHAR(60),
    subjob_number           VARCHAR(60),
    part_code               VARCHAR(60),
    part_description        VARCHAR(255),
    session_status          VARCHAR(30)  NOT NULL DEFAULT 'OPEN',
    available_input         NUMERIC(18,4) NOT NULL DEFAULT 0,
    accepted_output         NUMERIC(18,4) NOT NULL DEFAULT 0,
    rejected                NUMERIC(18,4) NOT NULL DEFAULT 0,
    rework                  NUMERIC(18,4) NOT NULL DEFAULT 0,
    scrap                   NUMERIC(18,4) NOT NULL DEFAULT 0,
    wip                     NUMERIC(18,4) NOT NULL DEFAULT 0,
    started_at              TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    created_by              VARCHAR(60),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_prod_execution_session_entry UNIQUE (entry_number)
);

CREATE INDEX IF NOT EXISTS idx_prod_execution_session_job_card  ON prod_execution_session(job_card_number);
CREATE INDEX IF NOT EXISTS idx_prod_execution_session_work_order ON prod_execution_session(work_order_number);

-- ----------------------------------------------------------------------------
-- prod_operation_event — normalized per-operation event (child of session)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_operation_event (
    id                  BIGSERIAL PRIMARY KEY,
    session_id          BIGINT NOT NULL,
    subjob_number       VARCHAR(60),
    operation_code      VARCHAR(60),
    seq                 INTEGER NOT NULL DEFAULT 0,
    machine_code        VARCHAR(60),
    operator_code       VARCHAR(60),
    start_time          TIMESTAMPTZ,
    end_time            TIMESTAMPTZ,
    operation_status    VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    hold_reason         VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_prod_operation_event_session_key UNIQUE (session_id, subjob_number, operation_code, seq),
    CONSTRAINT fk_prod_operation_event_session FOREIGN KEY (session_id)
        REFERENCES prod_execution_session(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_prod_operation_event_session ON prod_operation_event(session_id);

-- ----------------------------------------------------------------------------
-- prod_output_event — normalized per-output outcome (child of session + operation)
--   output_type: ACCEPTED / REJECTED / REWORK / SCRAP  (a category, not a status)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_output_event (
    id                   BIGSERIAL PRIMARY KEY,
    session_id           BIGINT NOT NULL,
    operation_event_id   BIGINT NOT NULL,
    output_type          VARCHAR(30) NOT NULL,
    item_code            VARCHAR(60),
    location             VARCHAR(60) NOT NULL DEFAULT 'STORE',
    quantity             NUMERIC(18,4) NOT NULL DEFAULT 0,
    reason_code          VARCHAR(120),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_prod_output_event_key UNIQUE (session_id, operation_event_id, output_type, item_code, location),
    CONSTRAINT fk_prod_output_event_session FOREIGN KEY (session_id)
        REFERENCES prod_execution_session(id) ON DELETE RESTRICT,
    CONSTRAINT fk_prod_output_event_operation FOREIGN KEY (operation_event_id)
        REFERENCES prod_operation_event(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_prod_output_event_session     ON prod_output_event(session_id);
CREATE INDEX IF NOT EXISTS idx_prod_output_event_operation   ON prod_output_event(operation_event_id);

-- ----------------------------------------------------------------------------
-- prod_backfill_progress — marker table for the SEPARATELY-GATED backfill job.
--   NOT executed in this subset (P3-08). Table is additive and reserved only.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_backfill_progress (
    id             BIGSERIAL PRIMARY KEY,
    job_card_number VARCHAR(60),
    last_entry_id  BIGINT,
    processed      BIGINT NOT NULL DEFAULT 0,
    status         VARCHAR(30),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_prod_backfill_progress_job UNIQUE (job_card_number)
);