-- FRS Planning & Production v2.0 — Phase 10: Master data

-- Idle Reason Master
CREATE TABLE IF NOT EXISTS idle_reason_master (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT DEFAULT 1,
    code VARCHAR(60) NOT NULL,
    description VARCHAR(200),
    category VARCHAR(30) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    UNIQUE(plant_id, code)
);

-- Pending Reason Master
CREATE TABLE IF NOT EXISTS pending_reason_master (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT DEFAULT 1,
    code VARCHAR(60) NOT NULL,
    description VARCHAR(200),
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    UNIQUE(plant_id, code)
);

-- Reject Reason Master
CREATE TABLE IF NOT EXISTS reject_reason_master (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT DEFAULT 1,
    code VARCHAR(60) NOT NULL,
    description VARCHAR(200),
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    UNIQUE(plant_id, code)
);

-- Approval Step (shared across ECR, Cost Estimate, BOM approval, CAPA)
CREATE TABLE IF NOT EXISTS approval_step (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT DEFAULT 1,
    doc_type VARCHAR(60) NOT NULL,
    doc_id BIGINT NOT NULL,
    step_no INT NOT NULL,
    role_required VARCHAR(60) NOT NULL,
    approver_user_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    decided_at TIMESTAMPTZ,
    comments VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route Operation Tool (replaces JSON tooling list)
CREATE TABLE IF NOT EXISTS route_operation_tool (
    id BIGSERIAL PRIMARY KEY,
    route_operation_id BIGINT NOT NULL,
    tool_id BIGINT,
    tool_code VARCHAR(60),
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1
);

-- Machine Load Plan
CREATE TABLE IF NOT EXISTS machine_load_plan (
    id BIGSERIAL PRIMARY KEY,
    plan_number VARCHAR(60) UNIQUE,
    plant_id BIGINT DEFAULT 1,
    machine_id BIGINT,
    machine_code VARCHAR(60),
    work_center_id BIGINT,
    plan_from DATE,
    plan_to DATE,
    total_capacity_hours DECIMAL(12,2),
    loaded_hours DECIMAL(12,2),
    available_hours DECIMAL(12,2),
    status VARCHAR(30) DEFAULT 'DRAFT',
    remarks VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ
);

-- Machine Load WO Mapping (replaces JSON WO_IDs_Contributing)
CREATE TABLE IF NOT EXISTS machine_load_wo_mapping (
    id BIGSERIAL PRIMARY KEY,
    machine_load_plan_id BIGINT NOT NULL REFERENCES machine_load_plan(id),
    work_order_id BIGINT NOT NULL,
    wo_number VARCHAR(60),
    job_card_id BIGINT,
    operation_seq INT,
    planned_start DATE,
    planned_end DATE,
    estimated_hours DECIMAL(12,2),
    priority INT DEFAULT 50,
    status VARCHAR(30) DEFAULT 'PLANNED'
);

-- Product Conversion
CREATE TABLE IF NOT EXISTS product_conversion (
    id BIGSERIAL PRIMARY KEY,
    doc_no VARCHAR(60) UNIQUE,
    plant_id BIGINT DEFAULT 1,
    conversion_type VARCHAR(30),
    source_warehouse_id BIGINT,
    dest_warehouse_id BIGINT,
    wo_id BIGINT,
    job_card_id BIGINT,
    is_inter_plant_transfer BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'DRAFT',
    remarks VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_conversion_input (
    id BIGSERIAL PRIMARY KEY,
    conversion_id BIGINT NOT NULL REFERENCES product_conversion(id),
    item_id BIGINT,
    item_code VARCHAR(60),
    batch_lot_no VARCHAR(60),
    qty DECIMAL(14,4) NOT NULL,
    uom VARCHAR(20),
    warehouse_id BIGINT,
    location VARCHAR(60)
);

CREATE TABLE IF NOT EXISTS product_conversion_output (
    id BIGSERIAL PRIMARY KEY,
    conversion_id BIGINT NOT NULL REFERENCES product_conversion(id),
    item_id BIGINT,
    item_code VARCHAR(60),
    batch_lot_no VARCHAR(60),
    qty DECIMAL(14,4) NOT NULL,
    uom VARCHAR(20),
    warehouse_id BIGINT,
    location VARCHAR(60)
);

CREATE TABLE IF NOT EXISTS product_conversion_loss (
    id BIGSERIAL PRIMARY KEY,
    conversion_id BIGINT NOT NULL REFERENCES product_conversion(id),
    process_loss_qty DECIMAL(14,4) NOT NULL,
    scrap_qty DECIMAL(14,4),
    loss_reason VARCHAR(500)
);

-- Item Master planning fields
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS planning_policy VARCHAR(30);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS ordering_policy VARCHAR(30);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS fixed_lot_size DECIMAL(14,4);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS min_stock_qty DECIMAL(14,4);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS max_stock_qty DECIMAL(14,4);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS safety_stock_qty DECIMAL(14,4);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS purchase_lead_time_days DECIMAL(8,2);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS manufacturing_lead_time_days DECIMAL(8,2);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS abc_class VARCHAR(5);

-- Shift Master crosses_midnight
ALTER TABLE shift_master ADD COLUMN IF NOT EXISTS crosses_midnight BOOLEAN DEFAULT FALSE;

-- Seed idle reasons
INSERT INTO idle_reason_master (plant_id, code, description, category, active) VALUES
(1, 'MATERIAL_WAIT', 'Waiting for material', 'MATERIAL', TRUE),
(1, 'TOOL_CHANGE', 'Tool change / setup', 'TOOL', TRUE),
(1, 'PROGRAM_EDIT', 'Program editing / proving', 'PROGRAM', TRUE),
(1, 'OPERATOR_BREAK', 'Operator break / absent', 'OPERATOR', TRUE),
(1, 'QUALITY_HOLD', 'Quality hold / rework review', 'QUALITY', TRUE),
(1, 'MAINTENANCE', 'Machine maintenance / breakdown', 'MAINTENANCE', TRUE),
(1, 'SETUP', 'Machine setup / changeover', 'SETUP', TRUE),
(1, 'DRAWING_MISSING', 'Drawing not available', 'DRAWING', TRUE),
(1, 'PLANNING_DELAY', 'Planning delay', 'PLANNING', TRUE),
(1, 'POWER_FAILURE', 'Power failure', 'POWER', TRUE),
(1, 'SHIFT_CHANGE', 'Shift changeover', 'OTHER', TRUE)
ON CONFLICT (plant_id, code) DO NOTHING;

-- Seed pending reasons
INSERT INTO pending_reason_master (plant_id, code, description, active) VALUES
(1, 'MATERIAL_SHORT', 'Material shortage', TRUE),
(1, 'TOOL_UNAVAILABLE', 'Tool / fixture not available', TRUE),
(1, 'PROGRAM_PENDING', 'Program pending approval', TRUE),
(1, 'QUALITY_ISSUE', 'Quality issue pending resolution', TRUE),
(1, 'MACHINE_DOWN', 'Machine breakdown', TRUE),
(1, 'DRAWING_REVISION', 'Drawing revision in progress', TRUE),
(1, 'CUSTOMER_HOLD', 'Customer hold', TRUE),
(1, 'ENGINEERING_REVIEW', 'Engineering review required', TRUE)
ON CONFLICT (plant_id, code) DO NOTHING;

-- Seed reject reasons
INSERT INTO reject_reason_master (plant_id, code, description, active) VALUES
(1, 'DIMENSIONAL', 'Dimensional out of tolerance', TRUE),
(1, 'SURFACE_FINISH', 'Surface finish defect', TRUE),
(1, 'MATERIAL_DEFECT', 'Material defect', TRUE),
(1, 'MACHINING_ERROR', 'Machining error', TRUE),
(1, 'SCRATCH', 'Scratch / handling damage', TRUE),
(1, 'WRONG_PROGRAM', 'Wrong program used', TRUE)
ON CONFLICT (plant_id, code) DO NOTHING;
