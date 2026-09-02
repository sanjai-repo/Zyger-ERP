-- V33: Quality Module v2.0 corrections — ENUMs, version, deleted_at, plant_id
-- Soft-delete: convert all hard DELETE endpoints to soft-delete via deleted_at
-- Add optimistic locking (version) to entities missing it
-- Add plant_id for multi-plant scoping

-- ===========================
-- QUALITY INSPECTION v2.0 corrections
-- ===========================
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(60);
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS approved_by_user_id BIGINT;
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS closed_by VARCHAR(60);
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(60);
ALTER TABLE quality_inspection ADD COLUMN IF NOT EXISTS reopened_by VARCHAR(60);

-- Ensure version exists (some entities may already have it from BaseDoc)
DO $$ BEGIN
  ALTER TABLE quality_inspection ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ===========================
-- QUALITY NCR v2.0 corrections
-- ===========================
ALTER TABLE quality_ncr ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_ncr ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_ncr ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- QUALITY CONCESSION v2.0 corrections
-- ===========================
ALTER TABLE quality_concession ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_concession ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_concession ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- QUALITY TEST CERTIFICATE v2.0 corrections
-- ===========================
ALTER TABLE quality_test_certificate ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_test_certificate ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_test_certificate ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- QUALITY CALIBRATION RECORD v2.0 corrections
-- ===========================
ALTER TABLE quality_calibration_record ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_calibration_record ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_calibration_record ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- QUALITY CALIBRATION INSTRUMENT v2.0 corrections
-- ===========================
ALTER TABLE quality_calibration_instrument ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_calibration_instrument ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_calibration_instrument ADD COLUMN IF NOT EXISTS qr_code_value VARCHAR(100);

-- ===========================
-- QUALITY CUSTOMER COMPLAINT v2.0 corrections
-- ===========================
ALTER TABLE quality_customer_complaint ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_customer_complaint ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_customer_complaint ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- QUALITY CAPA v2.0 corrections
-- ===========================
ALTER TABLE quality_capa ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_capa ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_capa ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- QUALITY 8D v2.0 corrections
-- ===========================
ALTER TABLE quality_8d ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE quality_8d ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE quality_8d ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- SPC FACT TABLE (Section 6.6)
-- ===========================
CREATE TABLE IF NOT EXISTS quality_characteristic_measurement (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id),
    inspection_id BIGINT NOT NULL,
    inspection_number VARCHAR(60),
    inspection_type VARCHAR(30),
    item_code VARCHAR(60),
    characteristic_code VARCHAR(60),
    characteristic_name VARCHAR(200),
    balloon_no VARCHAR(30),
    nominal_value DECIMAL(18,6),
    lower_limit DECIMAL(18,6),
    upper_limit DECIMAL(18,6),
    actual_value DECIMAL(18,6),
    actual_min DECIMAL(18,6),
    actual_max DECIMAL(18,6),
    actual_avg DECIMAL(18,6),
    deviation DECIMAL(18,6),
    result VARCHAR(20),
    machine_code VARCHAR(60),
    operator_code VARCHAR(60),
    inspection_date DATE,
    measured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_spc_item_char ON quality_characteristic_measurement(item_code, characteristic_code);
CREATE INDEX idx_spc_date ON quality_characteristic_measurement(inspection_date);

-- ===========================
-- ADD attachment_id to key quality tables
-- ===========================
ALTER TABLE quality_ncr ADD COLUMN IF NOT EXISTS require_photo BOOLEAN DEFAULT FALSE;
ALTER TABLE quality_capa ADD COLUMN IF NOT EXISTS effectiveness_check_date DATE;
ALTER TABLE quality_capa ADD COLUMN IF NOT EXISTS effectiveness_reminder_sent BOOLEAN DEFAULT FALSE;
