-- ============================================================================
-- V5__prod_backfill_infrastructure.sql
-- P3 correction (RC-2) — Additive backfill progress/outcome infrastructure.
-- ----------------------------------------------------------------------------
-- Scope (DOCUMENT_31 §9): CONTROLLED backfill mechanism only.
--   * prod_backfill_progress        (job-level progress/resume; one per scope/job_id)
--   * prod_backfill_entry_outcome   (per-entry outcome / audit trail; one per job+entry)
--
-- Mandatory rules honored:
--   * strictly additive — no DROP, no RENAME, no column type change
--   * no NOT NULL on legacy tables; no change to production_entry*/job_card/work_order
--   * natural-key UNIQUE constraints for idempotent replay (job_id; job_id+entry_number)
--   * hard DB FKs only WITHIN the backfill infrastructure (none to legacy)
--   * these tables never post inventory; never modify legacy production data
--   * idempotent (IF NOT EXISTS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- prod_backfill_progress — job-level progress/resume marker (one per job_id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_backfill_progress (
    id                        BIGSERIAL PRIMARY KEY,
    job_id                    VARCHAR(64)  NOT NULL,
    job_card_number           VARCHAR(60),
    status                    VARCHAR(30)  NOT NULL DEFAULT 'NOT_STARTED',
    last_processed_entry_id   BIGINT,
    last_successful_entry_id  BIGINT,
    batch_number              BIGINT,
    started_at                TIMESTAMPTZ,
    completed_at              TIMESTAMPTZ,
    failure_count             BIGINT       NOT NULL DEFAULT 0,
    last_error                VARCHAR(2000),
    quarantine_count          BIGINT       NOT NULL DEFAULT 0,
    processed_count           BIGINT       NOT NULL DEFAULT 0,
    success_count             BIGINT       NOT NULL DEFAULT 0,
    skip_count                BIGINT       NOT NULL DEFAULT 0,
    reconciliation_status     VARCHAR(30),
    version                   BIGINT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_prod_backfill_progress_job UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_prod_backfill_progress_job_card ON prod_backfill_progress(job_card_number);

-- ----------------------------------------------------------------------------
-- prod_backfill_entry_outcome — per-entry outcome/audit (one per job_id+entry_number)
--   outcome: PROJECTED / ALREADY_PROJECTED / QUARANTINED / FAILED / SKIPPED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_backfill_entry_outcome (
    id                   BIGSERIAL PRIMARY KEY,
    job_id               VARCHAR(64)  NOT NULL,
    entry_number         VARCHAR(60)  NOT NULL,
    legacy_id            BIGINT,
    outcome              VARCHAR(30)  NOT NULL,
    semantic_category    VARCHAR(30),
    authority            VARCHAR(30),
    reason_code          VARCHAR(60),
    effective_input      NUMERIC(18,4),
    eligibility          VARCHAR(30),
    resolution_note      VARCHAR(2000),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_prod_backfill_entry_outcome_job_entry UNIQUE (job_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_prod_backfill_entry_outcome_job ON prod_backfill_entry_outcome(job_id);
