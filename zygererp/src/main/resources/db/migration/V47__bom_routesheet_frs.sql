-- FRS BOM & Route Sheet v1.0: Schema fixes and new tables

-- ═══════════════════════════════════════════════════
-- 1. PROCESS MASTER: unique name constraint
-- ═══════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_process_name_unique ON process_master (LOWER(name)) WHERE active = true;

-- ═══════════════════════════════════════════════════
-- 2. RESOURCE MASTER: unique name constraint
-- ═══════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_name_unique ON resource_master (LOWER(resource_name));

-- ═══════════════════════════════════════════════════
-- 3. ROUTE SHEET: status constraint update (add RELEASED, UNDER_REVISION)
-- ═══════════════════════════════════════════════════
-- Drop old constraint if exists
DO $$ BEGIN
  ALTER TABLE route_sheet DROP CONSTRAINT IF EXISTS route_sheet_status_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE route_sheet ADD CONSTRAINT route_sheet_status_check
  CHECK (status IN ('DRAFT','RELEASED','UNDER_REVISION','OBSOLETE','SUBMITTED','APPROVED','REJECTED','CANCELLED'));

-- ═══════════════════════════════════════════════════
-- 4. ROUTE SHEET: one released per item constraint (partial unique index)
-- ═══════════════════════════════════════════════════
DROP INDEX IF EXISTS idx_route_sheet_item_active;
CREATE UNIQUE INDEX idx_route_sheet_released_per_item
  ON route_sheet (item_code) WHERE status = 'RELEASED';

-- ═══════════════════════════════════════════════════
-- 5. ROUTE OPERATION: sequence uniqueness per route sheet
-- ═══════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_route_op_seq_unique
  ON route_operation (route_sheet_id, sequence_no);

-- ═══════════════════════════════════════════════════
-- 6. ROUTE OPERATION: add process_code derived field
-- ═══════════════════════════════════════════════════
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS process_code VARCHAR(60);

-- Backfill process_code from process_master
UPDATE route_operation ro
SET process_code = pm.code
FROM process_master pm
WHERE ro.process_id = pm.id AND ro.process_code IS NULL;

-- ═══════════════════════════════════════════════════
-- 7. ROUTE SHEET: add item_type derived field, revision_no
-- ═══════════════════════════════════════════════════
ALTER TABLE route_sheet ADD COLUMN IF NOT EXISTS item_type VARCHAR(30);
ALTER TABLE route_sheet ADD COLUMN IF NOT EXISTS revision_no INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════
-- 8. PRODUCTION BOM: add specifications, revision_no
-- ═══════════════════════════════════════════════════
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS specifications TEXT;
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS revision_no INTEGER DEFAULT 0;

-- Backfill revision_no from bom_version
UPDATE production_bom SET revision_no = 0 WHERE revision_no IS NULL;

-- ═══════════════════════════════════════════════════
-- 9. BOM REVISION HISTORY (append-only audit table)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bom_revision_history (
    id BIGSERIAL PRIMARY KEY,
    bom_id BIGINT NOT NULL,
    revision_no INTEGER NOT NULL,
    bom_version VARCHAR(20),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100),
    remarks TEXT,
    previous_revision_id BIGINT,
    CONSTRAINT fk_bom_rev_history_bom FOREIGN KEY (bom_id) REFERENCES production_bom(id)
);
CREATE INDEX IF NOT EXISTS idx_bom_rev_history_bom ON bom_revision_history (bom_id, revision_no);

-- ═══════════════════════════════════════════════════
-- 10. PRODUCTION BOM LINE: add is_deleted soft-delete
-- ═══════════════════════════════════════════════════
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
