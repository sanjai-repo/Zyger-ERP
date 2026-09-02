-- V34: Maintenance Module v2.0 corrections — ENUMs, hierarchy, spares, real FKs

-- ===========================
-- MACHINE MASTER v2.0 additions
-- ===========================
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS parent_machine_id BIGINT REFERENCES machine_master(id);
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS criticality VARCHAR(10) DEFAULT 'B' CHECK (criticality IN ('A','B','C'));
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS qr_code_value VARCHAR(100);
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ===========================
-- TOOL MASTER v2.0 additions
-- ===========================
ALTER TABLE tool_master ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE tool_master ADD COLUMN IF NOT EXISTS qr_code_value VARCHAR(100);
ALTER TABLE tool_master ADD COLUMN IF NOT EXISTS life_limit_hours DECIMAL(12,2);
ALTER TABLE tool_master ADD COLUMN IF NOT EXISTS life_consumed_hours DECIMAL(12,2) DEFAULT 0;
ALTER TABLE tool_master ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ===========================
-- BREAKDOWN INTIMATION v2.0 corrections
-- ===========================
ALTER TABLE breakdown_intimation ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE breakdown_intimation ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- BREAKDOWN RECTIFICATION v2.0 corrections
-- ===========================
ALTER TABLE breakdown_rectification ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
ALTER TABLE breakdown_rectification ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- ===========================
-- SPARE PARTS LINE TABLES (Section 7.3)
-- ===========================
CREATE TABLE IF NOT EXISTS breakdown_rectification_part (
    id BIGSERIAL PRIMARY KEY,
    rectification_id BIGINT NOT NULL REFERENCES breakdown_rectification(id),
    spare_part_id BIGINT REFERENCES spare_part_master(id),
    spare_part_code VARCHAR(60),
    spare_part_name VARCHAR(200),
    qty_used DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(14,2) DEFAULT 0,
    inventory_txn_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pm_completion_part (
    id BIGSERIAL PRIMARY KEY,
    completion_id BIGINT NOT NULL,
    spare_part_id BIGINT REFERENCES spare_part_master(id),
    spare_part_code VARCHAR(60),
    spare_part_name VARCHAR(200),
    qty_used DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(14,2) DEFAULT 0,
    inventory_txn_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================
-- PM entities v2.0 corrections
-- ===========================
DO $$ BEGIN
  ALTER TABLE pm_plan ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE pm_plan ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE pm_plan ADD COLUMN deleted_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE pm_schedule ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE pm_schedule ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE pm_completion ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE pm_completion ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ===========================
-- TOOL SERVICE entities v2.0 corrections
-- ===========================
DO $$ BEGIN
  ALTER TABLE tool_service_intimation ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE tool_service_intimation ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE tool_service_rectification ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE tool_service_rectification ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ===========================
-- CALIBRATION SCHEDULE/ENTRY v2.0 corrections
-- ===========================
DO $$ BEGIN
  ALTER TABLE calibration_schedule ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE calibration_schedule ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE calibration_entry ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE calibration_entry ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ===========================
-- UTILITY entities v2.0 corrections
-- ===========================
DO $$ BEGIN
  ALTER TABLE power_consumption ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE power_consumption ADD COLUMN meter_id BIGINT REFERENCES meter_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE water_consumption ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE water_consumption ADD COLUMN meter_id BIGINT REFERENCES meter_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ===========================
-- RCA v2.0 corrections
-- ===========================
DO $$ BEGIN
  ALTER TABLE root_cause_analysis ADD COLUMN plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE root_cause_analysis ADD COLUMN version BIGINT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ===========================
-- OEE DAILY FACT TABLE (Section 7.5)
-- ===========================
CREATE TABLE IF NOT EXISTS oee_daily (
    id BIGSERIAL PRIMARY KEY,
    plant_id BIGINT DEFAULT 1 REFERENCES plant_master(id),
    machine_id BIGINT REFERENCES machine_master(id),
    machine_code VARCHAR(60),
    oee_date DATE NOT NULL,
    planned_time_min DECIMAL(10,2),
    run_time_min DECIMAL(10,2),
    downtime_min DECIMAL(10,2),
    ideal_cycle_time_sec DECIMAL(10,4),
    good_qty DECIMAL(12,2) DEFAULT 0,
    total_qty DECIMAL(12,2) DEFAULT 0,
    availability DECIMAL(6,4),
    performance DECIMAL(6,4),
    quality_rate DECIMAL(6,4),
    oee DECIMAL(6,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plant_id, machine_id, oee_date)
);
CREATE INDEX idx_oee_date ON oee_daily(oee_date);
CREATE INDEX idx_oee_machine ON oee_daily(machine_code);
