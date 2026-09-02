-- V27: CHECK constraints on status columns (defense in depth)
-- All constraints use IF EXISTS guards; tables created by Hibernate may or may not exist at migration time.
-- These mirror the application-level state machines in DocumentFacade and controllers.

-- Helper function: add constraint only if table exists
DO $$ BEGIN
    -- purchase_order: DRAFT→SUBMITTED→APPROVED→POSTED; REJECTED/CANCELLED/CLOSED/RECEIVED
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order') THEN
        ALTER TABLE purchase_order DROP CONSTRAINT IF EXISTS chk_po_status;
        ALTER TABLE purchase_order ADD CONSTRAINT chk_po_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED','POSTED','RECEIVED','CLOSED'));
    END IF;

    -- sales_order
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order') THEN
        ALTER TABLE sales_order DROP CONSTRAINT IF EXISTS chk_so_status;
        ALTER TABLE sales_order ADD CONSTRAINT chk_so_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED','POSTED','CLOSED'));
    END IF;

    -- work_order
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_order') THEN
        ALTER TABLE work_order DROP CONSTRAINT IF EXISTS chk_wo_status;
        ALTER TABLE work_order ADD CONSTRAINT chk_wo_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','RELEASED','IN_PROCESS','COMPLETED','CLOSED','REJECTED','CANCELLED'));
    END IF;

    -- quality_inspection
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quality_inspection') THEN
        ALTER TABLE quality_inspection DROP CONSTRAINT IF EXISTS chk_qi_status;
        ALTER TABLE quality_inspection ADD CONSTRAINT chk_qi_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED','HOLD','CLOSED'));
    END IF;

    -- production_entry
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_entry') THEN
        ALTER TABLE production_entry DROP CONSTRAINT IF EXISTS chk_pe_status;
        ALTER TABLE production_entry ADD CONSTRAINT chk_pe_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED'));
    END IF;

    -- job_card
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_card') THEN
        ALTER TABLE job_card DROP CONSTRAINT IF EXISTS chk_jc_status;
        ALTER TABLE job_card ADD CONSTRAINT chk_jc_status
            CHECK (status IN ('DRAFT','RELEASED','IN_PROGRESS','ON_HOLD','QUALITY_HOLD','COMPLETED','CLOSED','CANCELLED','PENDING'));
    END IF;

    -- production_bom
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_bom') THEN
        ALTER TABLE production_bom DROP CONSTRAINT IF EXISTS chk_bom_status;
        ALTER TABLE production_bom ADD CONSTRAINT chk_bom_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED','OBSOLETE'));
    END IF;

    -- route_sheet
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_sheet') THEN
        ALTER TABLE route_sheet DROP CONSTRAINT IF EXISTS chk_rs_status;
        ALTER TABLE route_sheet ADD CONSTRAINT chk_rs_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED','OBSOLETE'));
    END IF;

    -- product_conversion
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_conversion') THEN
        ALTER TABLE product_conversion DROP CONSTRAINT IF EXISTS chk_pc_status;
        ALTER TABLE product_conversion ADD CONSTRAINT chk_pc_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED','COMPLETED'));
    END IF;

    -- job_card_subjob
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_card_subjob') THEN
        ALTER TABLE job_card_subjob DROP CONSTRAINT IF EXISTS chk_jcs_status;
        ALTER TABLE job_card_subjob ADD CONSTRAINT chk_jcs_status
            CHECK (status IN ('PENDING','RELEASED','IN_PROGRESS','ON_HOLD','QUALITY_HOLD','COMPLETED','CANCELLED'));
    END IF;

    -- production_log_sheet
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_log_sheet') THEN
        ALTER TABLE production_log_sheet DROP CONSTRAINT IF EXISTS chk_pls_status;
        ALTER TABLE production_log_sheet ADD CONSTRAINT chk_pls_status
            CHECK (status IN ('DRAFT','VERIFIED','CLOSED','CANCELLED'));
    END IF;

    -- idle_time_entry
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'idle_time_entry') THEN
        ALTER TABLE idle_time_entry DROP CONSTRAINT IF EXISTS chk_ite_status;
        ALTER TABLE idle_time_entry ADD CONSTRAINT chk_ite_status
            CHECK (status IN ('DRAFT','VERIFIED','CANCELLED'));
    END IF;

    -- breakdown_intimation
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'breakdown_intimation') THEN
        ALTER TABLE breakdown_intimation DROP CONSTRAINT IF EXISTS chk_bi_status;
        ALTER TABLE breakdown_intimation ADD CONSTRAINT chk_bi_status
            CHECK (status IN ('OPEN','ASSIGNED','DIAGNOSED','CLOSED','CANCELLED'));
    END IF;

    -- breakdown_rectification
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'breakdown_rectification') THEN
        ALTER TABLE breakdown_rectification DROP CONSTRAINT IF EXISTS chk_br_status;
        ALTER TABLE breakdown_rectification ADD CONSTRAINT chk_br_status
            CHECK (status IN ('IN_PROGRESS','COMPLETED','CLOSED'));
    END IF;

    -- calibration_entry
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calibration_entry') THEN
        ALTER TABLE calibration_entry DROP CONSTRAINT IF EXISTS chk_ce_status;
        ALTER TABLE calibration_entry ADD CONSTRAINT chk_ce_status
            CHECK (status IN ('DRAFT','SUBMITTED','COMPLETED'));
    END IF;

    -- maintenance PM plan
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pm_plan') THEN
        ALTER TABLE pm_plan DROP CONSTRAINT IF EXISTS chk_pmp_status;
        ALTER TABLE pm_plan ADD CONSTRAINT chk_pmp_status
            CHECK (status IN ('ACTIVE','INACTIVE'));
    END IF;

    -- maintenance pm completion
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pm_completion') THEN
        ALTER TABLE pm_completion DROP CONSTRAINT IF EXISTS chk_pmc_status;
        ALTER TABLE pm_completion ADD CONSTRAINT chk_pmc_status
            CHECK (status IN ('DRAFT','VERIFIED','APPROVED'));
    END IF;

    -- cost_estimation
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_estimation') THEN
        ALTER TABLE cost_estimation DROP CONSTRAINT IF EXISTS chk_ce2_status;
        ALTER TABLE cost_estimation ADD CONSTRAINT chk_ce2_status
            CHECK (status IN ('DRAFT','SUBMITTED','APPROVED'));
    END IF;

    -- material_plan
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_plan') THEN
        ALTER TABLE material_plan DROP CONSTRAINT IF EXISTS chk_mp_status;
        ALTER TABLE material_plan ADD CONSTRAINT chk_mp_status
            CHECK (status IN ('DRAFT','COMPLETE'));
    END IF;
END $$;
