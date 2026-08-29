-- Maintenance: link spare_part_master back to inventory.item_master (spec 3/8)
-- 'reused, not re-created' - spare parts are maintenance references to the inventory catalog.

ALTER TABLE spare_part_master ADD COLUMN IF NOT EXISTS item_id BIGINT DEFAULT NULL REFERENCES item_master(id);
ALTER TABLE spare_part_master ADD COLUMN IF NOT EXISTS item_code VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_spm_item ON spare_part_master(item_id);