-- V36: Postgres Row-Level Security (RLS) plant scoping
-- Only applies to tables that actually have a plant_id column.

-- Drop old function if exists
DROP FUNCTION IF EXISTS _create_plant_policy(text);

-- Helper: create a standard plant-scoping policy, skip if column missing
CREATE OR REPLACE FUNCTION _create_plant_policy(tname text) RETURNS void AS $$
DECLARE
  has_plant boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = tname AND column_name = 'plant_id' AND table_schema = 'public'
  ) INTO has_plant;

  IF NOT has_plant THEN
    RAISE NOTICE 'Table % has no plant_id, skipping RLS', tname;
    RETURN;
  END IF;

  EXECUTE format(
    'ALTER TABLE %I ENABLE ROW LEVEL SECURITY',
    tname
  );
  EXECUTE format(
    'DROP POLICY IF EXISTS plant_isolation ON %I',
    tname
  );
  EXECUTE format(
    'CREATE POLICY plant_isolation ON %I USING (plant_id = current_setting(''app.current_plant_id'')::bigint)',
    tname
  );
END;
$$ LANGUAGE plpgsql;

-- Apply RLS policy to every table in the system
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'plant_id' AND table_schema = 'public'
    GROUP BY table_name
  LOOP
    PERFORM _create_plant_policy(tbl.table_name);
  END LOOP;
END $$;
