-- V3: Fix nullable boolean columns on item_master
ALTER TABLE item_master ALTER COLUMN batch_control SET DEFAULT false;
ALTER TABLE item_master ALTER COLUMN batch_control SET NOT NULL;
UPDATE item_master SET batch_control = false WHERE batch_control IS NULL;

ALTER TABLE item_master ALTER COLUMN serial_control SET DEFAULT false;
ALTER TABLE item_master ALTER COLUMN serial_control SET NOT NULL;
UPDATE item_master SET serial_control = false WHERE serial_control IS NULL;

ALTER TABLE item_master ALTER COLUMN inspection_required SET DEFAULT false;
ALTER TABLE item_master ALTER COLUMN inspection_required SET NOT NULL;
UPDATE item_master SET inspection_required = false WHERE inspection_required IS NULL;

ALTER TABLE item_master ALTER COLUMN requires_batch SET DEFAULT false;
ALTER TABLE item_master ALTER COLUMN requires_batch SET NOT NULL;
UPDATE item_master SET requires_batch = false WHERE requires_batch IS NULL;

ALTER TABLE item_master ALTER COLUMN requires_heat SET DEFAULT false;
ALTER TABLE item_master ALTER COLUMN requires_heat SET NOT NULL;
UPDATE item_master SET requires_heat = false WHERE requires_heat IS NULL;
