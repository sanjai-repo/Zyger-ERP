-- V53: Maintenance Module — PM Work Order, Spare Request/Issue bridge, Cost ledger (§5.3/§8/§10.4)

-- ═══════════════════════════════════════════
-- §5.3  PM WORK ORDER (releasable, assignable task)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pm_work_order (
    id BIGSERIAL PRIMARY KEY,
    work_order_number VARCHAR(60) UNIQUE NOT NULL,
    schedule_id BIGINT,
    schedule_number VARCHAR(60),
    plan_number VARCHAR(60),
    machine_code VARCHAR(60),
    title VARCHAR(300),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    assigned_to VARCHAR(60),
    assigned_technician_id BIGINT,
    released_date DATE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    verified_by VARCHAR(60),
    verdict VARCHAR(20),
    remarks VARCHAR(500),
    version BIGINT,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP, deleted_by VARCHAR(60),
    CONSTRAINT chk_pwo_status CHECK (status IN ('DRAFT','RELEASED','ASSIGNED','IN_PROGRESS','COMPLETED','VERIFIED','CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_pwo_status ON pm_work_order(status);
CREATE INDEX IF NOT EXISTS idx_pwo_machine ON pm_work_order(machine_code);
CREATE INDEX IF NOT EXISTS idx_pwo_technician ON pm_work_order(assigned_technician_id);

-- ═══════════════════════════════════════════
-- §8    MAINTENANCE SPARE REQUEST (bridge to inventory)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS maintenance_spare_request (
    id BIGSERIAL PRIMARY KEY,
    request_number VARCHAR(60) UNIQUE NOT NULL,
    source_type VARCHAR(30),
    source_id BIGINT,
    reference_number VARCHAR(60),
    machine_code VARCHAR(60),
    requested_by VARCHAR(60),
    requested_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    approved_by VARCHAR(60),
    approved_at TIMESTAMP,
    rejected_reason VARCHAR(500),
    remarks VARCHAR(500),
    version BIGINT,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP, deleted_by VARCHAR(60),
    CONSTRAINT chk_msr_status CHECK (status IN ('PENDING','APPROVED','PARTIALLY_ISSUED','ISSUED','REJECTED','CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_msr_status ON maintenance_spare_request(status);

CREATE TABLE IF NOT EXISTS maintenance_spare_request_line (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES maintenance_spare_request(id) ON DELETE CASCADE,
    spare_part_id BIGINT,
    item_code VARCHAR(60),
    item_name VARCHAR(200),
    uom VARCHAR(30) DEFAULT 'NOS',
    requested_qty NUMERIC(14,4) NOT NULL DEFAULT 0,
    issued_qty NUMERIC(14,4) NOT NULL DEFAULT 0,
    available_qty NUMERIC(14,4),
    unit_cost NUMERIC(14,4) DEFAULT 0,
    line_status VARCHAR(30) DEFAULT 'PENDING',
    inventory_txn_id BIGINT
);

-- ═══════════════════════════════════════════
-- §10.4 MAINTENANCE COST LEDGER (immutable once parent CLOSED)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS maintenance_cost_transaction (
    id BIGSERIAL PRIMARY KEY,
    cost_reference VARCHAR(60) UNIQUE,
    parent_type VARCHAR(30),
    parent_id BIGINT,
    parent_number VARCHAR(60),
    machine_code VARCHAR(60),
    cost_category VARCHAR(30) NOT NULL,
    cost_type VARCHAR(30),
    description TEXT,
    amount NUMERIC(14,4) NOT NULL DEFAULT 0,
    qty NUMERIC(14,4),
    rate NUMERIC(14,4),
    currency VARCHAR(10) DEFAULT 'INR',
    incurred_date DATE,
    posted_by VARCHAR(60),
    immutable BOOLEAN NOT NULL DEFAULT FALSE,
    reversal_id BIGINT,
    version BIGINT,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP, deleted_by VARCHAR(60),
    CONSTRAINT chk_mct_category CHECK (cost_category IN ('BREAKDOWN','PM','TOOLING','CALIBRATION','SPARE','LABOUR','CONTRACT','OTHER'))
);

CREATE INDEX IF NOT EXISTS idx_mct_parent ON maintenance_cost_transaction(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_mct_machine ON maintenance_cost_transaction(machine_code);
