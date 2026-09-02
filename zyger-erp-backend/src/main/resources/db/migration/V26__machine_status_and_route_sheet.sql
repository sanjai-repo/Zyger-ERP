-- FRS §4.5 Machine status enum expansion: no schema change needed.
-- machine_master.status stays VARCHAR(30). Valid values:
--   AVAILABLE (default), RUNNING, IN_USE, IDLE, UNDER_MAINTENANCE, BREAKDOWN
-- Normalize legacy values to the new default.
UPDATE machine_master SET status = 'AVAILABLE' WHERE status IS NULL OR status IN ('ACTIVE', 'OPERATIONAL');

-- FRS §8.3 Route sheet inspection trigger fields.
-- FRS "RouteSheetLine" is implemented by entity RouteOperation, table route_operation.
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS inspection_required BOOLEAN DEFAULT FALSE;
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS inspection_type VARCHAR(30);
ALTER TABLE route_operation ADD COLUMN IF NOT EXISTS alternate_machine_code VARCHAR(60);
