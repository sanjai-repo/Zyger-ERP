-- V41: FRS v2.0 entity hardening
-- Phase 21: ProductionEntry, JobCard, Subjob, LogActivity, IdleTime, LogSheet + RouteOperationTool

-- shop_floor_entry (ProductionEntry) new columns
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS plant_id BIGINT;
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS job_card_number VARCHAR(60);
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS shift_code VARCHAR(60);
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS is_backdated BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS backdated_reason VARCHAR(500);
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS is_overproduction BOOLEAN DEFAULT FALSE;
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS override_approved_by VARCHAR(100);
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS override_reason VARCHAR(500);
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS override_approved_at TIMESTAMPTZ;
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS client_offline_id VARCHAR(100);
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS corrects_entry_id BIGINT;
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS quality_status VARCHAR(30);
ALTER TABLE shop_floor_entry ADD COLUMN IF NOT EXISTS quantity_reconciled BOOLEAN DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sfe_client_offline_id ON shop_floor_entry(client_offline_id) WHERE client_offline_id IS NOT NULL;

-- job_card new columns
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS plant_id BIGINT;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS completed_qty_computed NUMERIC(18,4);
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS rework_qty_computed NUMERIC(18,4);
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS reject_qty_computed NUMERIC(18,4);
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS scrap_qty_computed NUMERIC(18,4);

-- job_card_subjob new columns
ALTER TABLE job_card_subjob ADD COLUMN IF NOT EXISTS plant_id BIGINT;
ALTER TABLE job_card_subjob ADD COLUMN IF NOT EXISTS route_detail_id BIGINT;
ALTER TABLE job_card_subjob ADD COLUMN IF NOT EXISTS completed_qty_computed NUMERIC(18,4);
ALTER TABLE job_card_subjob ADD COLUMN IF NOT EXISTS rework_qty_computed NUMERIC(18,4);
ALTER TABLE job_card_subjob ADD COLUMN IF NOT EXISTS reject_qty_computed NUMERIC(18,4);
ALTER TABLE job_card_subjob ADD COLUMN IF NOT EXISTS scrap_qty_computed NUMERIC(18,4);

-- production_log_activity new columns
ALTER TABLE production_log_activity ADD COLUMN IF NOT EXISTS related_breakdown_id BIGINT;
ALTER TABLE production_log_activity ADD COLUMN IF NOT EXISTS qty_completed_during_activity NUMERIC(18,4);

-- production_log_sheet new columns
ALTER TABLE production_log_sheet ADD COLUMN IF NOT EXISTS subjob_number VARCHAR(60);
ALTER TABLE production_log_sheet ADD COLUMN IF NOT EXISTS plant_id BIGINT;
ALTER TABLE production_log_sheet ADD COLUMN IF NOT EXISTS supervisor_verified_by VARCHAR(100);
ALTER TABLE production_log_sheet ADD COLUMN IF NOT EXISTS supervisor_verified_at TIMESTAMPTZ;

-- idle_time_entry new columns
ALTER TABLE idle_time_entry ADD COLUMN IF NOT EXISTS idle_reason_id BIGINT;
ALTER TABLE idle_time_entry ADD COLUMN IF NOT EXISTS plant_id BIGINT;
ALTER TABLE idle_time_entry ADD COLUMN IF NOT EXISTS subjob_number VARCHAR(60);

-- route_operation_tool table (new)
CREATE TABLE IF NOT EXISTS route_operation_tool (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    route_operation_id BIGINT NOT NULL,
    tool_code VARCHAR(60) NOT NULL,
    tool_description VARCHAR(200),
    tool_type VARCHAR(30),
    quantity_required NUMERIC(10,2),
    setup_time_min NUMERIC(10,2),
    remarks VARCHAR(300),
    CONSTRAINT fk_routine_tool_op FOREIGN KEY (route_operation_id) REFERENCES route_operation(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_routine_tool_op ON route_operation_tool(route_operation_id);
