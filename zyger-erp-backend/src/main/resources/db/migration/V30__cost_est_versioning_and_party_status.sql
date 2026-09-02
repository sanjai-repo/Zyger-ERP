-- V30: Cost Estimation versioning (section 8.6)
-- isActiveQuote field added to CostEstimation entity
-- estimationVersion already existed

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_estimation') THEN
        ALTER TABLE cost_estimation ADD COLUMN IF NOT EXISTS is_active_quote BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
