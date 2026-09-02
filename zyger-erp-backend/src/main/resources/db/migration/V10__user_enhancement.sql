-- V10: Enhance app_users with additional fields for User Management screen

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email VARCHAR(120);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS department VARCHAR(60);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS designation VARCHAR(60);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS created_by VARCHAR(80);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_by VARCHAR(80);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users(active);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
