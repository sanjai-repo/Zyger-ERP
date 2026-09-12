-- ============================================================================
-- V3__work_order_po_discriminator.sql
-- P2 — Canonical Production Order (WorkOrder) / Job Card foundation
-- ----------------------------------------------------------------------------
-- Scope (approved DOCUMENT_21 §27, decision D1/C1):
--   * work_order.order_type                 (PO discriminator, nullable, backfilled idempotent + null-safe)
--   * job_card.work_order_id                (additive nullable reference to work_order.id, indexed)
--   * job_card.route_operation_id           (additive nullable reference to route_operation.id, indexed)
--   * job_card_subjob.route_operation_id    (additive nullable reference to route_operation.id, indexed)
--
-- Mandatory rules honored:
--   * strictly additive  — no DROP, no RENAME, no column type change
--   * no removal of job_card.work_order_number (legacy string kept for compatibility)
--   * no NOT NULL until reconciliation is verified (all columns nullable)
--   * no new prod_order table
--   * no changes to production_entry*
--   * idempotent (IF NOT EXISTS) and null-safe (WHERE ... IS NULL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- work_order: additive PO discriminator + idempotent, null-safe backfill
-- ----------------------------------------------------------------------------
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS order_type VARCHAR;

UPDATE work_order
   SET order_type = 'SINGLE'
 WHERE order_type IS NULL;

-- ----------------------------------------------------------------------------
-- job_card: additive nullable FK reference to work_order.id + route traceability
-- ----------------------------------------------------------------------------
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS work_order_id BIGINT;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS route_operation_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_job_card_work_order_id      ON job_card(work_order_id);
CREATE INDEX IF NOT EXISTS idx_job_card_route_operation_id ON job_card(route_operation_id);

-- ----------------------------------------------------------------------------
-- job_card_subjob: additive route traceability
-- ----------------------------------------------------------------------------
ALTER TABLE job_card_subjob ADD COLUMN IF NOT EXISTS route_operation_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_job_card_subjob_route_operation_id ON job_card_subjob(route_operation_id);