-- FRS §6.5: Seed calibration override permission
-- This permission allows QA managers to override BLOCK calibration policy

-- Insert the QUALITY:CALIBRATION:OVERRIDE permission if it doesn't exist
INSERT INTO permissions (module, screen, action, description)
SELECT 'QUALITY', 'CALIBRATION', 'OVERRIDE', 'Override calibration BLOCK policy'
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE module = 'QUALITY' AND screen = 'CALIBRATION' AND action = 'OVERRIDE'
);

-- Assign to ADMIN role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN' AND p.module = 'QUALITY' AND p.screen = 'CALIBRATION' AND p.action = 'OVERRIDE'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Assign to QUALITY_MANAGER role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'QUALITY_MANAGER' AND p.module = 'QUALITY' AND p.screen = 'CALIBRATION' AND p.action = 'OVERRIDE'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- FRS §3.4: Ensure plant_id column exists on app_users for plant scoping
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS plant_id BIGINT DEFAULT 1;
