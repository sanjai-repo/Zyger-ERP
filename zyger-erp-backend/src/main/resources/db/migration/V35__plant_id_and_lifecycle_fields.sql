-- V35: Add plant_id to all existing BaseDoc-derived tables and lifecycle fields
-- This is safe — plantId defaults to 1 (the default plant)

-- Quality tables
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_concession ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_test_certificate ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_calibration_record ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_calibration_instrument ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_customer_complaint ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_capa ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_8d ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Maintenance tables
DO $$ BEGIN ALTER TABLE breakdown_intimation ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pm_plan ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pm_schedule ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE pm_completion ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tool_service_intimation ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tool_service_rectification ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE calibration_schedule ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE calibration_entry ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE power_consumption ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE water_consumption ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE root_cause_analysis ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE machine_master ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tool_master ADD COLUMN plant_id BIGINT DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add lifecycle fields (submittedBy/At, approvedByUserId, closedBy/At, cancelledBy/At, reopenedBy/At) to all BaseDoc tables
-- Use DO blocks to safely add if not exists
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN closed_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN closed_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN cancelled_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN cancelled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN reopened_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_inspection ADD COLUMN reopened_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- NCR
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN closed_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN closed_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN cancelled_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_ncr ADD COLUMN cancelled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Concession
DO $$ BEGIN ALTER TABLE quality_concession ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_concession ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_concession ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_concession ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_concession ADD COLUMN cancelled_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_concession ADD COLUMN cancelled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Test Certificate
DO $$ BEGIN ALTER TABLE quality_test_certificate ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_test_certificate ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_test_certificate ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_test_certificate ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_test_certificate ADD COLUMN cancelled_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_test_certificate ADD COLUMN cancelled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Customer Complaint
DO $$ BEGIN ALTER TABLE quality_customer_complaint ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_customer_complaint ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_customer_complaint ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_customer_complaint ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_customer_complaint ADD COLUMN closed_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_customer_complaint ADD COLUMN closed_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- CAPA
DO $$ BEGIN ALTER TABLE quality_capa ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_capa ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_capa ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_capa ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_capa ADD COLUMN closed_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_capa ADD COLUMN closed_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 8D
DO $$ BEGIN ALTER TABLE quality_8d ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_8d ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_8d ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_8d ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Calibration Record
DO $$ BEGIN ALTER TABLE quality_calibration_record ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE quality_calibration_record ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Breakdown Intimation
DO $$ BEGIN ALTER TABLE breakdown_intimation ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_intimation ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_intimation ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_intimation ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_intimation ADD COLUMN closed_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_intimation ADD COLUMN closed_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Breakdown Rectification
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN submitted_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN submitted_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN approved_by_user_id BIGINT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN approved_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN closed_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN closed_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN cancelled_by VARCHAR(60); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE breakdown_rectification ADD COLUMN cancelled_at TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
