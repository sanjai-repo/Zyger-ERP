-- V31: ECR/ECO two-stage strictness + MRP pegging enhancements

DO $$ BEGIN
    -- ECR/ECO: add ecr_status and eco_status columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engineering_change') THEN
        ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS ecr_status VARCHAR(30) DEFAULT 'DRAFT';
        ALTER TABLE engineering_change ADD COLUMN IF NOT EXISTS eco_status VARCHAR(30) DEFAULT 'DRAFT';
        -- Backfill existing data: set ecr_status = status for rows without ECO
        UPDATE engineering_change SET ecr_status = status WHERE ecr_status IS NULL;
    END IF;

    -- Material Plan Line: add priority column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_plan_line') THEN
        ALTER TABLE material_plan_line ADD COLUMN IF NOT EXISTS priority VARCHAR(20);
    END IF;
END $$;
