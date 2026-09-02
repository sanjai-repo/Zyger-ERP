CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(60) NOT NULL,
    module VARCHAR(30) NOT NULL,
    entity_type VARCHAR(30),
    entity_id BIGINT,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    recipient_role VARCHAR(60),
    message VARCHAR(500) NOT NULL,
    entity_ref VARCHAR(200),
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_module ON notifications (module);
