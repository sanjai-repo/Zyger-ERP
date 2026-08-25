-- V45: Planning Module Screen-Level FRS fields per Planning_Module_Screen_FRS_and_Doc_Numbering.md v2.0
-- Adds missing fields across all 10 sub-modules + new tables for MaterialReservation, FgPossible, CostComponentType

-- ============================================================
-- §3.1 Work Order — FG_Receipt_Qty, Scrap Allowance % on WO
-- ============================================================
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS fg_receipt_qty numeric(38,2);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS scrap_allowance_percent numeric(5,2);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS wo_type_enum VARCHAR(30);

-- ============================================================
-- §3.6 Dispatch Plan — QC Status, Packing Status, Delivery Priority
-- ============================================================
ALTER TABLE dispatch_plan ADD COLUMN IF NOT EXISTS qc_status VARCHAR(30);
ALTER TABLE dispatch_plan ADD COLUMN IF NOT EXISTS packing_status VARCHAR(30);
ALTER TABLE dispatch_plan ADD COLUMN IF NOT EXISTS delivery_priority VARCHAR(20);
ALTER TABLE dispatch_plan ADD COLUMN IF NOT EXISTS sales_order_ref VARCHAR(60);

-- ============================================================
-- §3.7 Machine Load WO Mapping — Reschedule Action fields
-- ============================================================
ALTER TABLE machine_load_wo_mapping ADD COLUMN IF NOT EXISTS reschedule_action VARCHAR(30);
ALTER TABLE machine_load_wo_mapping ADD COLUMN IF NOT EXISTS reschedule_machine_code VARCHAR(60);
ALTER TABLE machine_load_wo_mapping ADD COLUMN IF NOT EXISTS reschedule_shift VARCHAR(60);
ALTER TABLE machine_load_wo_mapping ADD COLUMN IF NOT EXISTS reschedule_date DATE;

-- ============================================================
-- §3.8 Engineering Change — Existing Orders Evaluated gate
-- ============================================================
ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS existing_orders_evaluated BOOLEAN DEFAULT FALSE;

-- ============================================================
-- §3.4 Material Plan Line — Reservation fields
-- ============================================================
ALTER TABLE material_plan_line ADD COLUMN IF NOT EXISTS reserved_qty numeric(38,2);
ALTER TABLE material_plan_line ADD COLUMN IF NOT EXISTS reservation_status VARCHAR(30);
ALTER TABLE material_plan_line ADD COLUMN IF NOT EXISTS allocated_stock numeric(38,2);

-- ============================================================
-- §3.4 Material Reservation (NEW TABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS material_reservation (
    id BIGSERIAL PRIMARY KEY,
    reservation_number VARCHAR(60) UNIQUE,
    detail_id BIGINT,
    work_order_id BIGINT,
    item_code VARCHAR(60) NOT NULL,
    reserved_qty numeric(38,2) NOT NULL,
    reserved_date TIMESTAMP,
    released_date TIMESTAMP,
    status VARCHAR(30) DEFAULT 'RESERVED',
    remarks VARCHAR(500),
    created_by VARCHAR(60),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mat_res_wo ON material_reservation(work_order_id);
CREATE INDEX IF NOT EXISTS idx_mat_res_item ON material_reservation(item_code);

-- ============================================================
-- §3.5 FG Possible (NEW PERSISTENT TABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS fg_possible (
    id BIGSERIAL PRIMARY KEY,
    inquiry_number VARCHAR(60) UNIQUE,
    item_code VARCHAR(60) NOT NULL,
    target_date DATE,
    include_wip BOOLEAN DEFAULT TRUE,
    include_open_po BOOLEAN DEFAULT TRUE,
    order_qty numeric(38,2),
    fg_possible_qty numeric(38,2),
    shortage_qty numeric(38,2),
    limiting_factor VARCHAR(500),
    decision_action VARCHAR(50),
    decision_remarks VARCHAR(500),
    run_by VARCHAR(100),
    run_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(30) DEFAULT 'DRAFT',
    breakdown_json TEXT,
    remarks VARCHAR(500),
    created_by VARCHAR(60),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- §3.10 Cost Component Type (NEW LOOKUP TABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS cost_component_type (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed default cost component types
INSERT INTO cost_component_type (code, name, sort_order) VALUES
    ('MATERIAL', 'Material Cost', 1),
    ('MACHINE', 'Machine Cost', 2),
    ('LABOUR', 'Labour Cost', 3),
    ('TOOLING', 'Tooling Cost', 4),
    ('SUBCONTRACT', 'Subcontract Cost', 5),
    ('OVERHEAD', 'Overhead Cost', 6),
    ('SCRAP', 'Scrap Allowance', 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- §1.2 Numbering Config — FRS format segments (PLANT/FY)
-- ============================================================
ALTER TABLE numbering_config ADD COLUMN IF NOT EXISTS use_plant_segment BOOLEAN DEFAULT FALSE;
ALTER TABLE numbering_config ADD COLUMN IF NOT EXISTS use_fy_segment BOOLEAN DEFAULT TRUE;
ALTER TABLE numbering_config ADD COLUMN IF NOT EXISTS fy_start_month INTEGER DEFAULT 4;

-- ============================================================
-- §3.3 Route Operation Inspection Parameters (NEW TABLE)
-- ============================================================
CREATE TABLE IF NOT EXISTS route_operation_inspection (
    id BIGSERIAL PRIMARY KEY,
    route_operation_id BIGINT NOT NULL,
    parameter_name VARCHAR(200) NOT NULL,
    parameter_type VARCHAR(30),
    nominal_value VARCHAR(100),
    tolerance_plus VARCHAR(100),
    tolerance_minus VARCHAR(100),
    inspection_method VARCHAR(100),
    tool_gauge VARCHAR(100),
    frequency VARCHAR(50),
    is_mandatory BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    remarks VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS idx_roi_operation ON route_operation_inspection(route_operation_id);

-- ============================================================
-- Seed default document numbering configs for Planning modules
-- ============================================================
INSERT INTO numbering_config (doc_type, prefix, zero_pad, reset_per_year, separator, active, use_plant_segment, use_fy_segment)
VALUES
    ('work-order', 'WO', 5, true, '/', true, false, true),
    ('production-bom', 'BOM', 5, true, '/', true, false, true),
    ('route-sheet', 'RS', 5, true, '/', true, false, true),
    ('material-plan', 'MRP', 5, true, '/', true, false, false),
    ('fg-possible', 'FGP', 5, true, '/', true, false, false),
    ('dispatch-plan', 'DSP', 5, true, '/', true, false, true),
    ('machine-load-plan', 'MLP', 5, true, '/', true, false, false),
    ('engineering-change-ecr', 'ECR', 5, true, '/', true, false, true),
    ('engineering-change-eco', 'ECO', 5, true, '/', true, false, true),
    ('gap-analysis', 'GAP', 5, true, '/', true, false, false),
    ('cost-estimation', 'EST', 5, true, '/', true, false, true)
ON CONFLICT (doc_type) DO NOTHING;
