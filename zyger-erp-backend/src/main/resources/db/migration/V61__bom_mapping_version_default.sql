UPDATE bom_mapping SET version = 0 WHERE version IS NULL;
ALTER TABLE bom_mapping ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE bom_mapping ALTER COLUMN version SET NOT NULL;