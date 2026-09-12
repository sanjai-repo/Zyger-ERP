--
-- V10__production_quality_gate.sql
-- P11 — Production Quality Gate (DOCUMENT_61, CLAR-PROD-012)
-- Gate enforced at operation/subjob completion + entry post; override =
--   Quality Supervisor AND Production Supervisor (joint) OR Plant Head; one-time,
--   operation scope, mandatory reason, audited, PPAP-blocked non-overridable.
--
-- SCOPE: Additive only. Two new tables (override record + audit log).
--   NO modification to production_entry, production_entry_batch, prod_output_event,
--   prod_execution_session, stock_ledger, stock_balance, production_batch_card*,
--   quality_inspection, or any existing table.
--
-- INVARIANTS:
--   * Gate code NEVER writes stock_ledger / stock_balance and never calls StockService.
--   * Override is ONE-TIME: applied once (status APPLIED) and never reusable.
--   * At most ONE active (PENDING/APPROVED) override per inspection (partial unique index).
--   * Mandatory reason + positive quantity enforced by DB CHECK.
--
SET search_path TO public;

-- ---------------------------------------------------------------------------
-- 1. Quality Gate override record (audited, one-time, operation-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE production_gate_override (
    id                         BIGSERIAL PRIMARY KEY,
    inspection_id              BIGINT NOT NULL REFERENCES quality_inspection (id),
    inspection_number          VARCHAR(80) NOT NULL,
    job_card_number            VARCHAR(80) NOT NULL,
    operation_code             VARCHAR(80),
    operation_sequence         INTEGER,
    item_code                  VARCHAR(60) NOT NULL,
    quantity                   NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
    batch_number               VARCHAR(60),
    reason                     VARCHAR(500) NOT NULL CHECK (btrim(reason) <> ''),
    category                   VARCHAR(20) NOT NULL DEFAULT 'JOINT',
    status                     VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    quality_approver_user      VARCHAR(80),
    quality_approved_at        TIMESTAMPTZ,
    production_approver_user   VARCHAR(80),
    production_approved_at     TIMESTAMPTZ,
    plant_head_approver_user   VARCHAR(80),
    plant_head_approved_at     TIMESTAMPTZ,
    applied_by_user            VARCHAR(80),
    applied_at                 TIMESTAMPTZ,
    created_by                 VARCHAR(80),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by                 VARCHAR(80),
    updated_at                 TIMESTAMPTZ,
    version                    BIGINT NOT NULL DEFAULT 0
);

-- One active override per inspection (idempotency + concurrency anchor)
CREATE UNIQUE INDEX uq_gate_override_active_inspection
    ON production_gate_override (inspection_id)
    WHERE status IN ('PENDING', 'APPROVED');

CREATE INDEX idx_gate_override_jobcard   ON production_gate_override (job_card_number);
CREATE INDEX idx_gate_override_inspection ON production_gate_override (inspection_id);
CREATE INDEX idx_gate_override_status    ON production_gate_override (status);

-- ---------------------------------------------------------------------------
-- 2. Gate override audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE production_gate_override_audit (
    id              BIGSERIAL PRIMARY KEY,
    override_id     BIGINT NOT NULL,
    event_type      VARCHAR(30) NOT NULL,
    previous_status VARCHAR(20),
    new_status      VARCHAR(20),
    changed_by_user VARCHAR(80),
    timestamp       TIMESTAMPTZ NOT NULL,
    details_json    TEXT
);
CREATE INDEX idx_gate_override_audit_ovr ON production_gate_override_audit (override_id);