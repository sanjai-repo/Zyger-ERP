-- V50: Notification Log table
CREATE TABLE IF NOT EXISTS notification_log (
    id BIGSERIAL PRIMARY KEY,
    recipient VARCHAR(100),
    channel VARCHAR(20),
    subject VARCHAR(255),
    body TEXT,
    source_type VARCHAR(30),
    source_id BIGINT,
    status VARCHAR(20) DEFAULT 'SENT',
    sent_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    error_message VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS idx_nl_recipient ON notification_log(recipient);
CREATE INDEX IF NOT EXISTS idx_nl_source ON notification_log(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_nl_created ON notification_log(sent_at);
