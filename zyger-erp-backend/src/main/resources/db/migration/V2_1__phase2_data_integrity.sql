-- V2: Phase 2 - Data Integrity columns (BigDecimal, soft-delete, optimistic locking, audit)
-- Generated from live schema after Hibernate update

-- BaseDoc additions: soft-delete, version, updatedBy on all doc tables
DO $$
DECLARE tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        WHERE c.column_name = 'doc_no'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl.table_name AND column_name = 'deleted') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN deleted BOOLEAN NOT NULL DEFAULT false', tbl.table_name);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl.table_name AND column_name = 'version') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN version BIGINT DEFAULT 0', tbl.table_name);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl.table_name AND column_name = 'updated_by') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN updated_by VARCHAR(255)', tbl.table_name);
        END IF;
    END LOOP;
END $$;

-- BaseLine additions: lineNo, warehouse
DO $$
DECLARE tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        WHERE c.column_name = 'item_code'
        AND c.table_name != 'stock_ledger'
        AND c.table_name != 'item_master'
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl.table_name AND column_name = 'line_no') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN line_no INTEGER', tbl.table_name);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl.table_name AND column_name = 'warehouse') THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN warehouse VARCHAR(60)', tbl.table_name);
        END IF;
    END LOOP;
END $$;

-- Master entity audit fields + @Version
ALTER TABLE party_master ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE party_master ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE location_master ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE location_master ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE machine_master ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE operation_master ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE operation_master ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE operation_master ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
ALTER TABLE operation_master ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE operation_master ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE work_center ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE work_center ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE work_center ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
ALTER TABLE work_center ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE work_center ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE item_master ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

-- DocSequence version for optimistic locking
ALTER TABLE doc_sequence ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
