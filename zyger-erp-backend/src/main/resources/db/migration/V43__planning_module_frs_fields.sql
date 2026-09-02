-- V43: Planning Module Master FRS — missing field additions
-- Additive-only: no destructive drops

-- ═══════════════════════════════════════════════════════════
-- 1. WORK ORDER — FRS §3.1 missing fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS drawing_rev VARCHAR(30);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS released_qty NUMERIC(18,4);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS completed_qty NUMERIC(18,4);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS rejected_qty NUMERIC(18,4);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS balance_qty NUMERIC(18,4);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS promised_delivery_date DATE;
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS batch_lot_no VARCHAR(60);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS production_department VARCHAR(100);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS so_line_id BIGINT;

-- ═══════════════════════════════════════════════════════════
-- 2. PRODUCTION BOM — FRS §3.2 missing fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS total_material_cost NUMERIC(18,4);

-- BOM Line — CNC material fields
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS material_grade VARCHAR(100);
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS material_form VARCHAR(60);
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS diameter NUMERIC(14,4);
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS required_length NUMERIC(14,4);
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS required_qty NUMERIC(14,4);
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS scrap_allowance NUMERIC(5,2);
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS heat_lot_number VARCHAR(60);
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ═══════════════════════════════════════════════════════════
-- 3. ROUTE SHEET — FRS §3.3 missing fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE route_sheet ADD COLUMN IF NOT EXISTS total_setup_time NUMERIC(14,2);
ALTER TABLE route_sheet ADD COLUMN IF NOT EXISTS total_cycle_time NUMERIC(14,2);
ALTER TABLE route_sheet ADD COLUMN IF NOT EXISTS total_run_time NUMERIC(14,2);

-- Route Operation — FRS §3.3 line fields
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS teardown_time NUMERIC(14,2);
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS subcontract_vendor_id BIGINT;
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS skill_grade_required VARCHAR(100);
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS manpower_count INTEGER;
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS operation_type VARCHAR(30);

-- ═══════════════════════════════════════════════════════════
-- 4. MATERIAL PLANNING — FRS §3.4 missing fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE material_plan ADD COLUMN IF NOT EXISTS planning_horizon_start DATE;
ALTER TABLE material_plan ADD COLUMN IF NOT EXISTS planning_horizon_end DATE;
ALTER TABLE material_plan ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(100);

-- ═══════════════════════════════════════════════════════════
-- 5. DISPATCH PLAN — FRS §3.6 missing fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE dispatch_plan ADD COLUMN IF NOT EXISTS delivery_address_id BIGINT;
ALTER TABLE dispatch_plan ADD COLUMN IF NOT EXISTS customer_po_number VARCHAR(60);

-- Dispatch Plan Line — FK fields
ALTER TABLE dispatch_plan_line ADD COLUMN IF NOT EXISTS so_id BIGINT;
ALTER TABLE dispatch_plan_line ADD COLUMN IF NOT EXISTS wo_id BIGINT;

-- ═══════════════════════════════════════════════════════════
-- 6. ENGINEERING CHANGE — FRS §3.8 missing fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS impact_analysis_json TEXT;
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS approved_by_chain TEXT;
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS implementation_plan TEXT;
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS cut_in_wo_no VARCHAR(60);
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS old_stock_disposition VARCHAR(30);
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS cost_impact_estimate NUMERIC(18,4);
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100);
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS verified_date TIMESTAMP;
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS closed_date TIMESTAMP;

-- ═══════════════════════════════════════════════════════════
-- 7. GAP ANALYSIS — FRS §3.9 missing fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE gap_analysis_result ADD COLUMN IF NOT EXISTS demand_hours NUMERIC(14,2);
ALTER TABLE gap_analysis_result ADD COLUMN IF NOT EXISTS supply_hours NUMERIC(14,2);
ALTER TABLE gap_analysis_result ADD COLUMN IF NOT EXISTS gap_hours NUMERIC(14,2);
ALTER TABLE gap_analysis_result ADD COLUMN IF NOT EXISTS gap_owner VARCHAR(100);
ALTER TABLE gap_analysis_result ADD COLUMN IF NOT EXISTS responsible_department VARCHAR(100);
ALTER TABLE gap_analysis_result ADD COLUMN IF NOT EXISTS expected_resolution_date DATE;

-- ═══════════════════════════════════════════════════════════
-- 8. COST ESTIMATION — FRS §3.10 missing fields
-- ═══════════════════════════════════════════════════════════
ALTER TABLE cost_estimation ADD COLUMN IF NOT EXISTS customer_id BIGINT;
ALTER TABLE cost_estimation ADD COLUMN IF NOT EXISTS so_id BIGINT;
ALTER TABLE cost_estimation ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP;
ALTER TABLE cost_estimation ADD COLUMN IF NOT EXISTS prepared_date TIMESTAMP;
