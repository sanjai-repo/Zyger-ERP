ALTER TABLE item_group ADD COLUMN IF NOT EXISTS item_type VARCHAR(50);
UPDATE item_group SET item_type = 'Purchasable Item' WHERE item_type IS NULL;
