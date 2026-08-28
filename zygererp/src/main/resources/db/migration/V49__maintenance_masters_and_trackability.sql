-- V49: Maintenance Module — Missing Masters + Trackability (Phase M1)

-- ═══════════════════════════════════════════
-- MASTERS
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS department_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS technician_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    skill_category VARCHAR(100),
    department_id BIGINT REFERENCES department_master(id),
    user_id VARCHAR(60),
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS breakdown_category_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS failure_code_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(60) UNIQUE NOT NULL,
    description VARCHAR(500) NOT NULL,
    breakdown_category_id BIGINT REFERENCES breakdown_category_master(id),
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS root_cause_code_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(60) UNIQUE NOT NULL,
    description VARCHAR(500) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_activity_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(60) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    default_frequency VARCHAR(30),
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_checklist_template (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    machine_type VARCHAR(60),
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_checklist_template_item (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES pm_checklist_template(id) ON DELETE CASCADE,
    activity_id BIGINT REFERENCES maintenance_activity_master(id),
    activity_name VARCHAR(200),
    is_mandatory BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0
);

-- Seed breakdown categories
INSERT INTO breakdown_category_master (code, name) VALUES
    ('MECHANICAL', 'Mechanical'),
    ('ELECTRICAL', 'Electrical'),
    ('HYDRAULIC', 'Hydraulic'),
    ('PNEUMATIC', 'Pneumatic'),
    ('CNC_CONTROL', 'CNC Control'),
    ('SOFTWARE', 'Software'),
    ('LUBRICATION', 'Lubrication'),
    ('TOOLING', 'Tooling'),
    ('COOLING', 'Cooling'),
    ('OTHER', 'Other')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════
-- TRANSACTION ENTITIES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS breakdown_assignment (
    id BIGSERIAL PRIMARY KEY,
    breakdown_id BIGINT NOT NULL REFERENCES breakdown_intimation(id),
    technician_id BIGINT NOT NULL REFERENCES technician_master(id),
    assigned_by VARCHAR(60),
    assigned_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(30) DEFAULT 'ASSIGNED',
    version BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ba_breakdown ON breakdown_assignment(breakdown_id);

CREATE TABLE IF NOT EXISTS pm_completion_checklist_item (
    id BIGSERIAL PRIMARY KEY,
    completion_id BIGINT NOT NULL REFERENCES pm_completion(id) ON DELETE CASCADE,
    activity_id BIGINT REFERENCES maintenance_activity_master(id),
    activity_name VARCHAR(200),
    is_mandatory BOOLEAN DEFAULT TRUE,
    result VARCHAR(20),
    measured_value VARCHAR(100),
    remarks VARCHAR(500),
    sort_order INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pmci_completion ON pm_completion_checklist_item(completion_id);

CREATE TABLE IF NOT EXISTS downtime_transaction (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL,
    machine_code VARCHAR(60),
    source_type VARCHAR(30),
    source_id BIGINT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT NOW(),
    version BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dt_machine ON downtime_transaction(machine_id);
CREATE INDEX IF NOT EXISTS idx_dt_source ON downtime_transaction(source_type, source_id);

CREATE TABLE IF NOT EXISTS maintenance_attachment (
    id BIGSERIAL PRIMARY KEY,
    source_type VARCHAR(30) NOT NULL,
    source_id BIGINT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(30),
    file_name VARCHAR(255),
    uploaded_by VARCHAR(60),
    uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_matt_source ON maintenance_attachment(source_type, source_id);

-- ═══════════════════════════════════════════
-- FK COLUMNS ON EXISTING TABLES
-- ═══════════════════════════════════════════

-- BreakdownIntimation: add FK columns
ALTER TABLE breakdown_intimation ADD COLUMN IF NOT EXISTS breakdown_category_id BIGINT REFERENCES breakdown_category_master(id);
ALTER TABLE breakdown_intimation ADD COLUMN IF NOT EXISTS operator_id BIGINT REFERENCES technician_master(id);
ALTER TABLE breakdown_intimation ADD COLUMN IF NOT EXISTS shift_id BIGINT;

-- BreakdownRectification: add FK columns
ALTER TABLE breakdown_rectification ADD COLUMN IF NOT EXISTS failure_code_id BIGINT REFERENCES failure_code_master(id);
ALTER TABLE breakdown_rectification ADD COLUMN IF NOT EXISTS technician_id BIGINT REFERENCES technician_master(id);

-- PMPlan: add FK columns
ALTER TABLE pm_plan ADD COLUMN IF NOT EXISTS checklist_template_id BIGINT REFERENCES pm_checklist_template(id);
ALTER TABLE pm_plan ADD COLUMN IF NOT EXISTS responsible_department_id BIGINT REFERENCES department_master(id);
ALTER TABLE pm_plan ADD COLUMN IF NOT EXISTS default_technician_id BIGINT REFERENCES technician_master(id);

-- PMCompletion: add supervisor FK
ALTER TABLE pm_completion ADD COLUMN IF NOT EXISTS supervisor_id BIGINT REFERENCES technician_master(id);

-- RootCauseAnalysis: add FK column
ALTER TABLE root_cause_analysis ADD COLUMN IF NOT EXISTS root_cause_code_id BIGINT REFERENCES root_cause_code_master(id);

-- ═══════════════════════════════════════════
-- STATUS CHECK CONSTRAINT FIXES
-- ═══════════════════════════════════════════

-- BreakdownIntimation: expand status enum (spec §18.1)
ALTER TABLE breakdown_intimation DROP CONSTRAINT IF EXISTS breakdown_intimation_status_check;
ALTER TABLE breakdown_intimation ADD CONSTRAINT breakdown_intimation_status_check
    CHECK (status IN ('OPEN','ASSIGNED','IN_DIAGNOSIS','DIAGNOSED','IN_PROGRESS','RECTIFIED','CLOSED','CANCELLED'));

-- PMCompletion: align with controller usage (spec §18.2)
ALTER TABLE pm_completion DROP CONSTRAINT IF EXISTS pm_completion_status_check;
ALTER TABLE pm_completion ADD CONSTRAINT pm_completion_status_check
    CHECK (status IN ('DRAFT','SUBMITTED','COMPLETED','VERIFIED','APPROVED'));

-- CalibrationSchedule: add DUE_SOON/DUE/OVERDUE (spec §18.4)
ALTER TABLE calibration_schedule DROP CONSTRAINT IF EXISTS calibration_schedule_calibration_status_check;
ALTER TABLE calibration_schedule ADD CONSTRAINT calibration_schedule_calibration_status_check
    CHECK (calibration_status IN ('VALID','DUE_SOON','DUE','OVERDUE','UNDER_CALIBRATION','FAILED','OUT_OF_SERVICE'));
