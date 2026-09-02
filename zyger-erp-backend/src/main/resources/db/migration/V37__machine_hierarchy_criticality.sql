-- V37: Machine hierarchy, criticality, and QR code fields
-- Adds parent_machine_id for sub-assembly tree, criticality ENUM, and qr_code_value for shop-floor scanning.

-- Criticality ENUM
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'machine_criticality') THEN
    CREATE TYPE machine_criticality AS ENUM ('A', 'B', 'C');
  END IF;
END $$;

ALTER TABLE machine_master
  ADD COLUMN IF NOT EXISTS parent_machine_id BIGINT,
  ADD COLUMN IF NOT EXISTS criticality machine_criticality DEFAULT 'B',
  ADD COLUMN IF NOT EXISTS qr_code_value VARCHAR(200),
  ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1;

ALTER TABLE machine_master
  ADD CONSTRAINT fk_machine_parent FOREIGN KEY (parent_machine_id) REFERENCES machine_master(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_machine_parent ON machine_master(parent_machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_criticality ON machine_master(criticality);
