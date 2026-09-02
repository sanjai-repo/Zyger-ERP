-- ============================================================
-- V9: Master Module — Complete master data tables
-- ============================================================

-- ── 1. Company Info (singleton row, id = 1) ────────────────
CREATE TABLE company_info (
    id              BIGSERIAL PRIMARY KEY,
    company_name    VARCHAR(200) NOT NULL,
    address_line1   VARCHAR(200),
    address_line2   VARCHAR(200),
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(20),
    country         VARCHAR(100) DEFAULT 'India',
    phone           VARCHAR(30),
    email           VARCHAR(120),
    website         VARCHAR(200),
    gst_number      VARCHAR(30),
    pan_number      VARCHAR(30),
    cin_number      VARCHAR(50),
    logo_path       VARCHAR(500),
    bank_name       VARCHAR(200),
    bank_account    VARCHAR(50),
    bank_ifsc       VARCHAR(30),
    bank_branch     VARCHAR(200),
    created_by      VARCHAR(60),
    created_at      TIMESTAMP,
    updated_by      VARCHAR(60),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);
INSERT INTO company_info (company_name) VALUES ('Zyger ERP');

-- ── 2. UOM Master ──────────────────────────────────────────
CREATE TABLE uom_master (
    id               BIGSERIAL PRIMARY KEY,
    code             VARCHAR(30) NOT NULL UNIQUE,
    name             VARCHAR(100) NOT NULL,
    base_uom         VARCHAR(30),
    conversion_factor NUMERIC(12,4) DEFAULT 1.0000,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by       VARCHAR(60),
    created_at       TIMESTAMP,
    updated_by       VARCHAR(60),
    updated_at       TIMESTAMP,
    version          BIGINT DEFAULT 0
);
CREATE INDEX idx_uom_active ON uom_master(active);

-- ── 3. Item Group (hierarchical) ───────────────────────────
CREATE TABLE item_group (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(60) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    parent_id   BIGINT REFERENCES item_group(id),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  VARCHAR(60),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(60),
    updated_at  TIMESTAMP,
    version     BIGINT DEFAULT 0
);
CREATE INDEX idx_item_group_parent ON item_group(parent_id);
CREATE INDEX idx_item_group_active ON item_group(active);

-- ── 4. Store Master (enhanced location) ────────────────────
CREATE TABLE store_master (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(60) NOT NULL UNIQUE,
    name          VARCHAR(200) NOT NULL,
    description   VARCHAR(500),
    store_type    VARCHAR(60),
    department    VARCHAR(60),
    location_ref  VARCHAR(60),
    is_qc_hold    BOOLEAN NOT NULL DEFAULT FALSE,
    is_wip        BOOLEAN NOT NULL DEFAULT FALSE,
    is_finished   BOOLEAN NOT NULL DEFAULT FALSE,
    is_raw        BOOLEAN NOT NULL DEFAULT FALSE,
    is_scrap      BOOLEAN NOT NULL DEFAULT FALSE,
    is_dispatch   BOOLEAN NOT NULL DEFAULT FALSE,
    bin_location  VARCHAR(100),
    capacity      NUMERIC(12,2),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_by    VARCHAR(60),
    created_at    TIMESTAMP,
    updated_by    VARCHAR(60),
    updated_at    TIMESTAMP,
    version       BIGINT DEFAULT 0
);
CREATE INDEX idx_store_type ON store_master(store_type);
CREATE INDEX idx_store_active ON store_master(active);

-- ── 5. Process Group ───────────────────────────────────────
CREATE TABLE process_group (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(60) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  VARCHAR(60),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(60),
    updated_at  TIMESTAMP,
    version     BIGINT DEFAULT 0
);
CREATE INDEX idx_process_group_active ON process_group(active);

-- ── 6. Process Master (enhanced, linked to group) ──────────
CREATE TABLE process_master (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(60) NOT NULL UNIQUE,
    name              VARCHAR(200) NOT NULL,
    description       VARCHAR(500),
    process_group_id  BIGINT REFERENCES process_group(id),
    cycle_time        NUMERIC(10,2),
    setup_time        NUMERIC(10,2),
    unit_rate         NUMERIC(12,2),
    machine_required  BOOLEAN DEFAULT FALSE,
    inspection        BOOLEAN DEFAULT FALSE,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_by        VARCHAR(60),
    created_at        TIMESTAMP,
    updated_by        VARCHAR(60),
    updated_at        TIMESTAMP,
    version           BIGINT DEFAULT 0
);
CREATE INDEX idx_process_group ON process_master(process_group_id);
CREATE INDEX idx_process_active ON process_master(active);

-- ── 7. Instrument Master ───────────────────────────────────
CREATE TABLE instrument_master (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(60) NOT NULL UNIQUE,
    name              VARCHAR(200) NOT NULL,
    instrument_type   VARCHAR(60),
    manufacturer      VARCHAR(200),
    model             VARCHAR(200),
    serial_number     VARCHAR(100),
    range_min         NUMERIC(12,4),
    range_max         NUMERIC(12,4),
    accuracy          VARCHAR(60),
    least_count       NUMERIC(12,4),
    calibration_due   DATE,
    calibration_cycle VARCHAR(60),
    current_status    VARCHAR(30) DEFAULT 'AVAILABLE',
    store_code        VARCHAR(60),
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_by        VARCHAR(60),
    created_at        TIMESTAMP,
    updated_by        VARCHAR(60),
    updated_at        TIMESTAMP,
    version           BIGINT DEFAULT 0
);
CREATE INDEX idx_instrument_type ON instrument_master(instrument_type);
CREATE INDEX idx_instrument_status ON instrument_master(current_status);
CREATE INDEX idx_instrument_active ON instrument_master(active);

-- ── 8. Tool Master ─────────────────────────────────────────
CREATE TABLE tool_master (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(60) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    tool_type       VARCHAR(60),
    material        VARCHAR(100),
    shape           VARCHAR(100),
    dimension       VARCHAR(100),
    machine_compatible VARCHAR(200),
    diameter        NUMERIC(10,4),
    flute_length    NUMERIC(10,4),
    overall_length  NUMERIC(10,4),
    holder_type     VARCHAR(100),
    tool_life_count NUMERIC(12,2),
    tool_life_unit  VARCHAR(30) DEFAULT 'PIECES',
    current_usage   NUMERIC(12,2) DEFAULT 0,
    supplier_code   VARCHAR(60),
    unit_cost       NUMERIC(12,2),
    reorder_level   NUMERIC(12,2),
    current_status  VARCHAR(30) DEFAULT 'AVAILABLE',
    store_code      VARCHAR(60),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      VARCHAR(60),
    created_at      TIMESTAMP,
    updated_by      VARCHAR(60),
    updated_at      TIMESTAMP,
    version         BIGINT DEFAULT 0
);
CREATE INDEX idx_tool_type ON tool_master(tool_type);
CREATE INDEX idx_tool_status ON tool_master(current_status);
CREATE INDEX idx_tool_active ON tool_master(active);

-- ── 9. Master Audit Log ────────────────────────────────────
CREATE TABLE master_audit_log (
    id            BIGSERIAL PRIMARY KEY,
    entity_type   VARCHAR(60) NOT NULL,
    entity_id     BIGINT NOT NULL,
    action        VARCHAR(30) NOT NULL,
    field_name    VARCHAR(100),
    old_value     TEXT,
    new_value     TEXT,
    changed_by    VARCHAR(60),
    changed_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON master_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_changed_at ON master_audit_log(changed_at);

-- ── 10. Enhance existing tables ────────────────────────────

-- item_master: add item_group, material_grade, specification, product_type
ALTER TABLE item_master ADD COLUMN item_group_id    BIGINT REFERENCES item_group(id);
ALTER TABLE item_master ADD COLUMN material_grade   VARCHAR(100);
ALTER TABLE item_master ADD COLUMN specification    VARCHAR(200);
ALTER TABLE item_master ADD COLUMN product_type     VARCHAR(60);
ALTER TABLE item_master ADD COLUMN uom_id           BIGINT REFERENCES uom_master(id);
ALTER TABLE item_master ADD COLUMN drawing_path     VARCHAR(500);
ALTER TABLE item_master ADD COLUMN dimension_type   VARCHAR(60);
ALTER TABLE item_master ADD COLUMN hs_code          VARCHAR(30);
ALTER TABLE item_master ADD COLUMN weight           NUMERIC(12,4);
ALTER TABLE item_master ADD COLUMN weight_uom       VARCHAR(20);
ALTER TABLE item_master ADD COLUMN min_stock_level  NUMERIC(12,2);
ALTER TABLE item_master ADD COLUMN max_stock_level  NUMERIC(12,2);
ALTER TABLE item_master ADD COLUMN reorder_point    NUMERIC(12,2);
ALTER TABLE item_master ADD COLUMN moq              NUMERIC(12,2);
ALTER TABLE item_master ADD COLUMN lead_time_days2  INTEGER;
ALTER TABLE item_master ADD COLUMN hsn_code         VARCHAR(30);
ALTER TABLE item_master ADD COLUMN supplier_lead_time INTEGER;
ALTER TABLE item_master ADD COLUMN avg_daily_consumption NUMERIC(12,4);
ALTER TABLE item_master ADD COLUMN shelf_life_days2 INTEGER;
ALTER TABLE item_master ADD COLUMN storage_category VARCHAR(60);
ALTER TABLE item_master ADD COLUMN barcode          VARCHAR(100);
ALTER TABLE item_master ADD COLUMN alternate_items  VARCHAR(500);
ALTER TABLE item_master ADD COLUMN substitute_items VARCHAR(500);
ALTER TABLE item_master ADD COLUMN parent_item      VARCHAR(60);
ALTER TABLE item_master ADD COLUMN batch_control2   BOOLEAN DEFAULT FALSE;
ALTER TABLE item_master ADD COLUMN material_type    VARCHAR(60);
CREATE INDEX idx_item_group_ref ON item_master(item_group_id);
CREATE INDEX idx_item_uom_ref ON item_master(uom_id);

-- party_master: add customer/supplier/subcontractor-specific fields
ALTER TABLE party_master ADD COLUMN supplier_type   VARCHAR(60);
ALTER TABLE party_master ADD COLUMN vendor_type     VARCHAR(60);
ALTER TABLE party_master ADD COLUMN material_group  VARCHAR(100);
ALTER TABLE party_master ADD COLUMN inspection_required BOOLEAN DEFAULT FALSE;
ALTER TABLE party_master ADD COLUMN lead_time_days  INTEGER;
ALTER TABLE party_master ADD COLUMN min_order_value NUMERIC(12,2);
ALTER TABLE party_master ADD COLUMN payment_terms_code VARCHAR(30);
ALTER TABLE party_master ADD COLUMN delivery_terms VARCHAR(200);
ALTER TABLE party_master ADD COLUMN bank_account_no VARCHAR(50);
ALTER TABLE party_master ADD COLUMN bank_name      VARCHAR(200);
ALTER TABLE party_master ADD COLUMN bank_ifsc      VARCHAR(30);
ALTER TABLE party_master ADD COLUMN bank_branch    VARCHAR(200);
ALTER TABLE party_master ADD COLUMN credit_days    INTEGER;
ALTER TABLE party_master ADD COLUMN credit_limit   NUMERIC(14,2);
ALTER TABLE party_master ADD COLUMN quality_rating VARCHAR(30);
ALTER TABLE party_master ADD COLUMN on_time_delivery VARCHAR(30);
ALTER TABLE party_master ADD COLUMN total_business  NUMERIC(14,2);
ALTER TABLE party_master ADD COLUMN blacklist_status VARCHAR(30);
ALTER TABLE party_master ADD COLUMN blacklisted     BOOLEAN DEFAULT FALSE;
ALTER TABLE party_master ADD COLUMN mccm_code      VARCHAR(30);
ALTER TABLE party_master ADD COLUMN total_machine   INTEGER;
ALTER TABLE party_master ADD COLUMN annual_capacity VARCHAR(100);
ALTER TABLE party_master ADD COLUMN certifications  VARCHAR(500);
ALTER TABLE party_master ADD COLUMN turnaround_time INTEGER;

-- machine_master: add manufacturer, model, serial, dates, power
ALTER TABLE machine_master ADD COLUMN manufacturer       VARCHAR(200);
ALTER TABLE machine_master ADD COLUMN model               VARCHAR(200);
ALTER TABLE machine_master ADD COLUMN serial_number       VARCHAR(100);
ALTER TABLE machine_master ADD COLUMN installation_date   DATE;
ALTER TABLE machine_master ADD COLUMN year_of_manufacture INTEGER;
ALTER TABLE machine_master ADD COLUMN machine_condition   VARCHAR(30);
ALTER TABLE machine_master ADD COLUMN power_rating_kw     NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN spindle_speed_rpm   INTEGER;
ALTER TABLE machine_master ADD COLUMN travel_x_mm        NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN travel_y_mm        NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN travel_z_mm        NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN table_size         VARCHAR(60);
ALTER TABLE machine_master ADD COLUMN control_type       VARCHAR(100);
ALTER TABLE machine_master ADD COLUMN max_load_kg        NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN coolant_capacity   NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN oil_capacity       NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN machine_age_years  INTEGER;
ALTER TABLE machine_master ADD COLUMN depreciation_rate  NUMERIC(5,2);
ALTER TABLE machine_master ADD COLUMN insurance_value    NUMERIC(14,2);
ALTER TABLE machine_master ADD COLUMN purchase_cost      NUMERIC(14,2);
ALTER TABLE machine_master ADD COLUMN supplier_code      VARCHAR(60);
ALTER TABLE machine_master ADD COLUMN last_maintenance   DATE;
ALTER TABLE machine_master ADD COLUMN next_maintenance   DATE;
ALTER TABLE machine_master ADD COLUMN total_maintenance_cost NUMERIC(14,2);
ALTER TABLE machine_master ADD COLUMN breakdown_count    INTEGER DEFAULT 0;
ALTER TABLE machine_master ADD COLUMN downtime_hours     NUMERIC(10,2) DEFAULT 0;
ALTER TABLE machine_master ADD COLUMN mtbf_hours         NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN mttr_hours         NUMERIC(10,2);
ALTER TABLE machine_master ADD COLUMN no_of_operator     INTEGER DEFAULT 0;
ALTER TABLE machine_master ADD COLUMN skill_required     VARCHAR(200);
ALTER TABLE machine_master ADD COLUMN shift_required     INTEGER DEFAULT 1;
ALTER TABLE machine_master ADD COLUMN oil_level         VARCHAR(30);
ALTER TABLE machine_master ADD COLUMN spindle_condition  VARCHAR(30);
ALTER TABLE machine_master ADD COLUMN coolant_level     VARCHAR(30);
ALTER TABLE machine_master ADD COLUMN vibration_level   VARCHAR(30);
ALTER TABLE machine_master ADD COLUMN temperature       NUMERIC(6,2);
ALTER TABLE machine_master ADD COLUMN notes             TEXT;
CREATE INDEX idx_machine_manufacturer ON machine_master(manufacturer);
CREATE INDEX idx_machine_next_maint ON machine_master(next_maintenance);
