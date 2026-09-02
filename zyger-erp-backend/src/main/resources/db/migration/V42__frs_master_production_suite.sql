-- FRS Master Production Suite: Add missing fields and create ResourceMaster
-- Phase 0-5: Item, Process, Resource, BOM, Route Sheet, Sales Order, Work Order

-- ============================================================
-- PHASE 0: Item Master — add `name` alias for FRS compliance
-- ============================================================
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS name VARCHAR(200);
UPDATE item_master SET name = description WHERE name IS NULL;

-- ============================================================
-- PHASE 1: Resource Master — new unified entity
-- ============================================================
CREATE TABLE IF NOT EXISTS resource_master (
    id BIGSERIAL PRIMARY KEY,
    resource_code VARCHAR(60) NOT NULL UNIQUE,
    resource_name VARCHAR(200) NOT NULL,
    resource_type VARCHAR(30) NOT NULL,  -- Machine, Labour, Tool, Vendor
    capacity DECIMAL(12,2) NOT NULL DEFAULT 1,
    capacity_uom VARCHAR(30) NOT NULL DEFAULT 'Pieces/Hour',
    department VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',  -- Active, Inactive
    active BOOLEAN NOT NULL DEFAULT TRUE,
    hourly_rate DECIMAL(12,2),
    description VARCHAR(500),
    plant_id BIGINT DEFAULT 1,
    version BIGINT DEFAULT 0,
    created_by VARCHAR(100),
    created_at TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

-- ============================================================
-- PHASE 1: Process Master — add FK to ResourceMaster + process_type
-- ============================================================
ALTER TABLE process_master ADD COLUMN IF NOT EXISTS required_resource_id BIGINT;
ALTER TABLE process_master ADD COLUMN IF NOT EXISTS process_type VARCHAR(30) DEFAULT 'Insource';
ALTER TABLE process_master ADD COLUMN IF NOT EXISTS resource_name VARCHAR(200);
ALTER TABLE process_master ADD COLUMN IF NOT EXISTS resource_type VARCHAR(30);

ALTER TABLE process_master ADD CONSTRAINT fk_process_resource
    FOREIGN KEY (required_resource_id) REFERENCES resource_master(id);

-- ============================================================
-- PHASE 2: BOM — add FRS fields
-- ============================================================
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS item_type VARCHAR(30) DEFAULT 'FG';
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS sales_order_id BIGINT;
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS weight DECIMAL(14,4) DEFAULT 0;
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS previous_revision_id BIGINT;
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS bom_type VARCHAR(30) DEFAULT 'Primary';
ALTER TABLE production_bom ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- BOM line: level, weight fields
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS bom_level VARCHAR(20);
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS weight_per_qty DECIMAL(14,4) DEFAULT 0;
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS total_weight DECIMAL(14,4) DEFAULT 0;

-- ============================================================
-- PHASE 3: Route Sheet — add FK to ProcessMaster + ResourceMaster
-- ============================================================
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS process_id BIGINT;
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS resource_id BIGINT;
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS resource_name VARCHAR(200);
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS resource_type VARCHAR(30);
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS process_type VARCHAR(30);

ALTER TABLE route_operation ADD CONSTRAINT fk_route_op_process
    FOREIGN KEY (process_id) REFERENCES process_master(id);
ALTER TABLE route_operation ADD CONSTRAINT fk_route_op_resource
    FOREIGN KEY (resource_id) REFERENCES resource_master(id);

-- ============================================================
-- PHASE 4: Sales Order — add Open/Fixed type + terms
-- ============================================================
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS so_type VARCHAR(30) DEFAULT 'Fixed';
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- SalesOrderItem: add pending_qty for WO tracking
ALTER TABLE sales_order_item ADD COLUMN IF NOT EXISTS pending_qty DECIMAL(14,4);
-- Initialize pending_qty from order_qty where not set
UPDATE sales_order_item SET pending_qty = order_qty WHERE pending_qty IS NULL;

-- ============================================================
-- PHASE 5: Work Order — add pending_qty + sales_order FK
-- ============================================================
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS pending_qty DECIMAL(14,4);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS production_qty DECIMAL(14,4);
ALTER TABLE work_order ADD COLUMN IF NOT EXISTS sales_order_id BIGINT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bom_item_active ON production_bom(item_code, is_active);
CREATE INDEX IF NOT EXISTS idx_route_item_status ON route_sheet(item_code, status);
CREATE INDEX IF NOT EXISTS idx_wo_so ON work_order(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_so_item_pending ON sales_order_item(doc_id, item_code);
CREATE INDEX IF NOT EXISTS idx_resource_type ON resource_master(resource_type, active);
