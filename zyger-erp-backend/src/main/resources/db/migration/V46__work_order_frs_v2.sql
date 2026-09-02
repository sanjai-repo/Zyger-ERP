-- FRS-WO-001 v1.0: Add missing display fields and computed columns
-- bom_code / route_sheet_code on work_order header for FRS §3.1 display
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS bom_code VARCHAR(60);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS route_sheet_code VARCHAR(60);

-- uom and balance_qty on work_order_material for FRS §3.2
ALTER TABLE work_order_material ADD COLUMN IF NOT EXISTS uom VARCHAR(20);
ALTER TABLE work_order_material ADD COLUMN IF NOT EXISTS balance_qty NUMERIC(38,5);

-- Index for SO pending qty query performance
CREATE INDEX IF NOT EXISTS idx_wo_so_status ON work_order(sales_order_id, status);
