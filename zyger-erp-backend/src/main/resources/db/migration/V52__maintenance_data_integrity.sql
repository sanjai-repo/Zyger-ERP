-- V52: Maintenance data-integrity hardening — Phase A
-- (BR-21) non-negative cost/quantity/duration constraints
-- (BR-13) breakdown_assignment.secondary_assignee flag
-- (BR-14) downtime data-quality flag
-- (BR-12) partial unique index: one active open breakdown per machine (best-effort DB mirror)

-- ===========================
-- BR-21: non-negative constraints (defense in depth)
-- ===========================

-- Breakdown rectification cost / labour / downtime
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'breakdown_rectification') THEN
        ALTER TABLE breakdown_rectification DROP CONSTRAINT IF EXISTS chk_br_labour_hours;
        ALTER TABLE breakdown_rectification ADD CONSTRAINT chk_br_labour_hours
            CHECK (labour_hours IS NULL OR labour_hours >= 0);

        ALTER TABLE breakdown_rectification DROP CONSTRAINT IF EXISTS chk_br_service_cost;
        ALTER TABLE breakdown_rectification ADD CONSTRAINT chk_br_service_cost
            CHECK (service_cost IS NULL OR service_cost >= 0);

        ALTER TABLE breakdown_rectification DROP CONSTRAINT IF EXISTS chk_br_downtime;
        ALTER TABLE breakdown_rectification ADD CONSTRAINT chk_br_downtime
            CHECK (downtime_minutes IS NULL OR downtime_minutes >= 0);
    END IF;
END $$;

-- PM completion labour / duration
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pm_completion') THEN
        ALTER TABLE pm_completion DROP CONSTRAINT IF EXISTS chk_pmc_labour;
        ALTER TABLE pm_completion ADD CONSTRAINT chk_pmc_labour
            CHECK (labour_hours IS NULL OR labour_hours >= 0);

        ALTER TABLE pm_completion DROP CONSTRAINT IF EXISTS chk_pmc_duration;
        ALTER TABLE pm_completion ADD CONSTRAINT chk_pmc_duration
            CHECK (duration_hours IS NULL OR duration_hours >= 0);
    END IF;
END $$;

-- Calibration entry cost
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calibration_entry') THEN
        ALTER TABLE calibration_entry DROP CONSTRAINT IF EXISTS chk_ce_cost;
        ALTER TABLE calibration_entry ADD CONSTRAINT chk_ce_cost
            CHECK (calibration_cost IS NULL OR calibration_cost >= 0);
    END IF;
END $$;

-- Downtime transaction: non-negative duration + data-quality flag
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'downtime_transaction') THEN
        ALTER TABLE downtime_transaction DROP CONSTRAINT IF EXISTS chk_dt_duration;
        ALTER TABLE downtime_transaction ADD CONSTRAINT chk_dt_duration
            CHECK (duration_minutes IS NULL OR duration_minutes >= 0);
    END IF;
END $$;

-- ===========================
-- BR-14: data-quality flag on downtime_transaction
-- ===========================
ALTER TABLE downtime_transaction ADD COLUMN IF NOT EXISTS is_data_quality_flagged BOOLEAN DEFAULT FALSE;

-- ===========================
-- BR-13: secondary assignee flag on breakdown_assignment
-- ===========================
ALTER TABLE breakdown_assignment ADD COLUMN IF NOT EXISTS secondary_assignee BOOLEAN DEFAULT FALSE;

-- ===========================
-- BR-12: partial unique index (DB mirror of app-level guard)
-- One active (non-closed, non-cancelled) breakdown intimation per machine.
-- ===========================
DROP INDEX IF EXISTS uq_machine_active_breakdown;
CREATE UNIQUE INDEX uq_machine_active_breakdown
    ON breakdown_intimation (machine_code)
    WHERE status IN ('OPEN','ASSIGNED','DIAGNOSED','IN_DIAGNOSIS','IN_PROGRESS');
