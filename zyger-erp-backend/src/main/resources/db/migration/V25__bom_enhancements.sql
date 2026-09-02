ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS scrap_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS component_type VARCHAR(30) DEFAULT 'RAW_MATERIAL';
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS is_phantom BOOLEAN DEFAULT FALSE;
ALTER TABLE production_bom_line ADD COLUMN IF NOT EXISTS substitute_priority INTEGER;
