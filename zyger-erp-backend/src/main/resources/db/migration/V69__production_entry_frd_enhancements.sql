-- Migration V69: Production Entry FRD Enhancements (v1.0)

ALTER TABLE production_entry
    ADD COLUMN IF NOT EXISTS entry_type VARCHAR(30) DEFAULT 'Production Entry',
    ADD COLUMN IF NOT EXISTS production_type VARCHAR(30) DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS supervisor_code VARCHAR(60),
    ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20),
    ADD COLUMN IF NOT EXISTS route_sheet_number VARCHAR(60),
    ADD COLUMN IF NOT EXISTS pending_sequence_only BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS process_qty NUMERIC(18,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS route_sheet_qty NUMERIC(18,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS uom VARCHAR(20),
    ADD COLUMN IF NOT EXISTS route_sheet_date DATE,
    ADD COLUMN IF NOT EXISTS process_time NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS process_rate NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS mhr NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS item_weight NUMERIC(14,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS idle_time NUMERIC(14,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS idle_reason VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reversed_from_entry_id BIGINT,
    ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reversal_reason VARCHAR(500);

-- Table for Multiple Operators (MO)
CREATE TABLE IF NOT EXISTS production_entry_operator (
    id BIGSERIAL PRIMARY KEY,
    production_entry_id BIGINT NOT NULL REFERENCES production_entry(id) ON DELETE CASCADE,
    operator_code VARCHAR(60) NOT NULL,
    operator_name VARCHAR(200),
    is_primary BOOLEAN DEFAULT FALSE,
    hours_worked NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for Reason-wise Rejection breakdown
CREATE TABLE IF NOT EXISTS production_entry_rejection (
    id BIGSERIAL PRIMARY KEY,
    production_entry_id BIGINT NOT NULL REFERENCES production_entry(id) ON DELETE CASCADE,
    reason_code VARCHAR(60) NOT NULL,
    reason_description VARCHAR(255),
    quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for Rework Reasons & Target Rework Routing
CREATE TABLE IF NOT EXISTS production_entry_rework (
    id BIGSERIAL PRIMARY KEY,
    production_entry_id BIGINT NOT NULL REFERENCES production_entry(id) ON DELETE CASCADE,
    reason_code VARCHAR(60) NOT NULL,
    reason_description VARCHAR(255),
    quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
    target_process_code VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for Material Issue / Consumption Details
CREATE TABLE IF NOT EXISTS production_entry_material (
    id BIGSERIAL PRIMARY KEY,
    production_entry_id BIGINT NOT NULL REFERENCES production_entry(id) ON DELETE CASCADE,
    rm_code VARCHAR(60) NOT NULL,
    req_qty NUMERIC(18,4) DEFAULT 0,
    total_issued_qty NUMERIC(18,4) DEFAULT 0,
    available_qty NUMERIC(18,4) DEFAULT 0,
    scrap_qty NUMERIC(18,4) DEFAULT 0,
    rp_qty NUMERIC(18,4) DEFAULT 0,
    consumed_qty NUMERIC(18,4) DEFAULT 0,
    deviation_qty NUMERIC(18,4) DEFAULT 0,
    return_qty NUMERIC(18,4) DEFAULT 0,
    rate NUMERIC(14,2) DEFAULT 0,
    batch_number VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table for Batch Allocation & Tracking
CREATE TABLE IF NOT EXISTS production_entry_batch (
    id BIGSERIAL PRIMARY KEY,
    production_entry_id BIGINT NOT NULL REFERENCES production_entry(id) ON DELETE CASCADE,
    batch_number VARCHAR(60) NOT NULL,
    allocated_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
    warehouse_code VARCHAR(60),
    batch_type VARCHAR(20) DEFAULT 'OUTPUT',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pe_work_order ON production_entry(work_order_number);
CREATE INDEX IF NOT EXISTS idx_pe_job_card ON production_entry(job_card_number);
CREATE INDEX IF NOT EXISTS idx_pe_part ON production_entry(part_code);
CREATE INDEX IF NOT EXISTS idx_pe_status ON production_entry(status);
