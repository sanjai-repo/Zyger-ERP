-- Performance indexes for high-traffic lookup patterns.
-- All additions are additive; no columns/tables are altered.

-- 1) Item master: every item screen / BOM dropdown filters on (active, item_type).
CREATE INDEX IF NOT EXISTS idx_item_master_active_type
    ON item_master (active, item_type);

-- 2) Item groups are fetched and grouped by their type (group dropdowns, BOM buckets).
CREATE INDEX IF NOT EXISTS idx_item_group_type_active
    ON item_group (item_type, active);
CREATE INDEX IF NOT EXISTS idx_item_group_type
    ON item_group (item_type);

-- 3) Notifications are polled per recipient: "unread, newest first".
CREATE INDEX IF NOT EXISTS idx_nl_recipient_read
    ON notification_log (recipient, read_at, sent_at DESC);

-- 4) Audit history navigates entity -> timeline.
CREATE INDEX IF NOT EXISTS idx_audit_entity_changed
    ON master_audit_log (entity_type, entity_id, changed_at DESC);