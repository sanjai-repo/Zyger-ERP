-- V51: User Management — approval workflow, screens, per-user access overrides, audit logs
-- Note: primary DDL is applied by Hibernate (ddl-auto: update). This migration is kept
-- idempotent and mirrors the entity changes for clean-DB provisioning and records.

-- 1) app_users approval / status columns
-- NOTE: "status" is a reserved keyword in PostgreSQL; quote it explicitly so it
-- can be created even though Hibernate's ddl-auto:update silently skips it.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS requested_role VARCHAR(60);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS approved_role VARCHAR(60);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS approved_by BIGINT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users("status");

-- Backfill: existing account flags map to status
UPDATE app_users SET "status" = 'ACTIVE' WHERE "status" IS NULL AND active = true;
UPDATE app_users SET "status" = 'DISABLED' WHERE "status" IS NULL AND active = false;

-- 2) screens table (left panel of the access control matrix)
CREATE TABLE IF NOT EXISTS screens (
    id BIGSERIAL PRIMARY KEY,
    screen_key VARCHAR(60) UNIQUE NOT NULL,
    screen_name VARCHAR(120) NOT NULL,
    parent_screen_id BIGINT,
    sort_order INT DEFAULT 0,
    module VARCHAR(80),
    active BOOLEAN DEFAULT true,
    created_by VARCHAR(80),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3) user screen permissions (per-user override matrix)
CREATE TABLE IF NOT EXISTS user_screen_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    screen_id BIGINT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_export BOOLEAN DEFAULT false,
    granted_by BIGINT REFERENCES app_users(id),
    granted_at TIMESTAMP,
    UNIQUE (user_id, screen_id)
);
CREATE INDEX IF NOT EXISTS idx_usp_user ON user_screen_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_usp_screen ON user_screen_permissions(screen_id);

-- 4) audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES app_users(id),
    action VARCHAR(60) NOT NULL,
    target_user_id BIGINT REFERENCES app_users(id),
    metadata TEXT,
    ip_address VARCHAR(60),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
