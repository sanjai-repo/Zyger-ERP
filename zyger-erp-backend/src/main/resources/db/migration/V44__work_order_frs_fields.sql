-- V44: Work Order Management Module FRS-WO-001 — missing field additions
-- Additive-only: no destructive drops

-- ═══════════════════════════════════════════════════════════
-- 1. WORK ORDER — FRS §9 header fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS item_description VARCHAR(255);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(500);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS hold_reason VARCHAR(500);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS short_close_reason VARCHAR(500);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS started_by VARCHAR(60);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS completed_by VARCHAR(60);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS bom_revision VARCHAR(20);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS route_revision VARCHAR(20);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS sales_order_no VARCHAR(30);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS sales_order_line_no VARCHAR(20);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS scrap_qty NUMERIC(18,5);

-- ═══════════════════════════════════════════════════════════
-- 2. WORK ORDER STATUS HISTORY — FRS §19.3
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS work_order_status_history (
    id              BIGSERIAL PRIMARY KEY,
    work_order_id   BIGINT NOT NULL,
    wo_number       VARCHAR(30),
    from_status     VARCHAR(20),
    to_status       VARCHAR(20),
    reason          VARCHAR(500),
    created_by      VARCHAR(60),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_status_history_wo_id ON work_order_status_history(work_order_id);

-- ═══════════════════════════════════════════════════════════
-- 3. WORK ORDER — performance indexes (FRS §20.1)
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_work_order_status ON work_order(status);
CREATE INDEX IF NOT EXISTS idx_work_order_planned_end ON work_order(planned_end_date);
CREATE INDEX IF NOT EXISTS idx_work_order_item_code ON work_order(item_code);
CREATE INDEX IF NOT EXISTS idx_work_order_customer_code ON work_order(customer_code);
