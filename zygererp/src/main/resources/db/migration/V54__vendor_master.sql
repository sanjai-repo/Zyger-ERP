-- Maintenance module: vendor_master (spec 3) + vendor FK on transaction tables
-- Replaces free-text externalVendor / vendor with a master-linked reference.

CREATE TABLE IF NOT EXISTS vendor_master (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(120),
    contact_phone VARCHAR(40),
    email VARCHAR(120),
    service_category VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(60), created_at TIMESTAMP,
    updated_by VARCHAR(60), updated_at TIMESTAMP
);

-- Breakdown Rectification: optional vendor link (spec 4.3 external_vendor_id)
ALTER TABLE breakdown_rectification ADD COLUMN IF NOT EXISTS vendor_id BIGINT DEFAULT NULL REFERENCES vendor_master(id);

-- Tool Service Intimation: optional vendor link (spec 6.1 vendor_id)
ALTER TABLE tool_service_intimation ADD COLUMN IF NOT EXISTS vendor_id BIGINT DEFAULT NULL REFERENCES vendor_master(id);

CREATE INDEX IF NOT EXISTS idx_br_vendor ON breakdown_rectification(vendor_id);
CREATE INDEX IF NOT EXISTS idx_tsi_vendor ON tool_service_intimation(vendor_id);