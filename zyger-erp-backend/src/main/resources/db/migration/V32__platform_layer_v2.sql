-- V32: Platform Layer v2.0 — Plant Master, new Master tables, BaseDoc additions
-- Part 1 of the v2.0 production-grade rebuild

-- ===========================
-- PLANT MASTER (multi-plant scoping)
-- ===========================
CREATE TABLE plant_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    timezone VARCHAR(60) DEFAULT 'Asia/Kolkata',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO plant_master (code, name, active) VALUES ('PLANT01', 'Zyger Default Plant', TRUE);

-- ===========================
-- WORK CENTER MASTER
-- ===========================
CREATE TABLE work_center_master (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plant_master(id),
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    department VARCHAR(60),
    capacity DECIMAL(14,2),
    hourly_rate DECIMAL(14,2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- SHIFT MASTER
-- ===========================
CREATE TABLE shift_master (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plant_master(id),
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO shift_master (plant_id, code, name, start_time, end_time, active) VALUES
(1, 'SHIFT-A', 'Morning Shift', '06:00', '14:00', TRUE),
(1, 'SHIFT-B', 'Afternoon Shift', '14:00', '22:00', TRUE),
(1, 'SHIFT-C', 'Night Shift', '22:00', '06:00', TRUE);

-- ===========================
-- METER MASTER (for power/water consumption)
-- ===========================
CREATE TABLE meter_master (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plant_master(id),
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    meter_type VARCHAR(20) NOT NULL CHECK (meter_type IN ('POWER','WATER')),
    location VARCHAR(200),
    machine_id BIGINT,
    budget_monthly_units DECIMAL(18,2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- SPARE PART MASTER
-- ===========================
CREATE TABLE spare_part_master (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plant_master(id),
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    uom VARCHAR(30) DEFAULT 'NOS',
    reorder_level DECIMAL(12,2) DEFAULT 0,
    unit_cost DECIMAL(14,2) DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- SAMPLING PLAN MASTER (ISO 2859-1 / ANSI Z1.4)
-- ===========================
CREATE TABLE sampling_plan_master (
    id BIGSERIAL PRIMARY KEY,
    standard VARCHAR(30) NOT NULL DEFAULT 'ISO2859_1',
    inspection_level VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    lot_size_min INTEGER NOT NULL,
    lot_size_max INTEGER NOT NULL,
    aql DECIMAL(6,2) NOT NULL DEFAULT 1.0,
    sample_size INTEGER NOT NULL,
    accept_number INTEGER NOT NULL,
    reject_number INTEGER NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed ISO 2859-1 Level II, AQL 1.0 (General Inspection)
INSERT INTO sampling_plan_master (standard, inspection_level, lot_size_min, lot_size_max, aql, sample_size, accept_number, reject_number, active) VALUES
('ISO2859_1', 'GENERAL', 2, 8, 1.0, 2, 0, 1, TRUE),
('ISO2859_1', 'GENERAL', 9, 15, 1.0, 3, 0, 1, TRUE),
('ISO2859_1', 'GENERAL', 16, 25, 1.0, 5, 0, 1, TRUE),
('ISO2859_1', 'GENERAL', 26, 50, 1.0, 8, 0, 1, TRUE),
('ISO2859_1', 'GENERAL', 51, 90, 1.0, 13, 1, 2, TRUE),
('ISO2859_1', 'GENERAL', 91, 150, 1.0, 20, 1, 2, TRUE),
('ISO2859_1', 'GENERAL', 151, 280, 1.0, 32, 2, 3, TRUE),
('ISO2859_1', 'GENERAL', 281, 500, 1.0, 50, 3, 4, TRUE),
('ISO2859_1', 'GENERAL', 501, 1200, 1.0, 80, 5, 6, TRUE),
('ISO2859_1', 'GENERAL', 1201, 3200, 1.0, 125, 7, 8, TRUE),
('ISO2859_1', 'GENERAL', 3201, 10000, 1.0, 200, 10, 11, TRUE),
('ISO2859_1', 'GENERAL', 10001, 35000, 1.0, 315, 14, 15, TRUE),
('ISO2859_1', 'GENERAL', 35001, 150000, 1.0, 500, 21, 22, TRUE),
('ISO2859_1', 'GENERAL', 150001, 500000, 1.0, 800, 21, 22, TRUE);

-- ===========================
-- INSPECTION PLAN MASTER (core auto-fill enabler)
-- ===========================
CREATE TABLE inspection_plan (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plant_master(id),
    item_code VARCHAR(60) NOT NULL,
    drawing_number VARCHAR(60),
    drawing_revision VARCHAR(30),
    operation VARCHAR(200),
    inspection_type VARCHAR(30) NOT NULL,
    aql DECIMAL(6,2) DEFAULT 1.0,
    sampling_plan_id BIGINT REFERENCES sampling_plan_master(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version BIGINT DEFAULT 0,
    UNIQUE(plant_id, item_code, drawing_number, drawing_revision, operation, inspection_type)
);

CREATE TABLE inspection_plan_characteristic (
    id BIGSERIAL PRIMARY KEY,
    plan_id BIGINT NOT NULL REFERENCES inspection_plan(id) ON DELETE CASCADE,
    balloon_no VARCHAR(30),
    characteristic_code VARCHAR(60),
    characteristic_name VARCHAR(200) NOT NULL,
    data_type VARCHAR(30) DEFAULT 'NUMERIC',
    specification_text VARCHAR(300),
    nominal_value DECIMAL(18,6),
    lower_limit DECIMAL(18,6),
    upper_limit DECIMAL(18,6),
    tolerance DECIMAL(18,6),
    uom VARCHAR(30),
    is_mandatory BOOLEAN DEFAULT FALSE,
    is_critical BOOLEAN DEFAULT FALSE,
    is_special BOOLEAN DEFAULT FALSE,
    measurement_method VARCHAR(200),
    required_instrument_type VARCHAR(60),
    line_no INTEGER,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- ATTACHMENT TABLE (polymorphic, Section 3.3)
-- ===========================
CREATE TABLE attachment (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plant_master(id),
    owner_type VARCHAR(60) NOT NULL,
    owner_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    storage_path VARCHAR(500) NOT NULL,
    checksum_sha256 VARCHAR(64),
    category VARCHAR(30) DEFAULT 'OTHER',
    uploaded_by VARCHAR(60),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_attachment_owner ON attachment(owner_type, owner_id) WHERE deleted_at IS NULL;

-- ===========================
-- Escalation rules (Section 3.5)
-- ===========================
CREATE TABLE escalation_rule (
    id BIGSERIAL PRIMARY KEY,
    doc_key VARCHAR(60) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    sla_hours INTEGER NOT NULL,
    escalate_to_role VARCHAR(60) NOT NULL,
    notify_channels VARCHAR(200) DEFAULT 'IN_APP',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE escalation_log (
    id BIGSERIAL PRIMARY KEY,
    rule_id BIGINT REFERENCES escalation_rule(id),
    doc_key VARCHAR(60) NOT NULL,
    doc_id BIGINT NOT NULL,
    action VARCHAR(30) NOT NULL,
    escalated_to VARCHAR(60),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
