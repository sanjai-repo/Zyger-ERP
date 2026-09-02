-- FRS Route Sheet & Masters FRD Enhancements
ALTER TABLE process_master ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE route_sheet ADD COLUMN IF NOT EXISTS effective_from DATE;
ALTER TABLE route_sheet ADD COLUMN IF NOT EXISTS effective_to DATE;
