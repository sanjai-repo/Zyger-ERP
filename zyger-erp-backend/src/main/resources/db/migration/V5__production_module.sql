-- V5__production_module.sql
-- Production Module: 7 sub-modules

-- 1. Job Card (main)
CREATE TABLE IF NOT EXISTS job_card (
    id BIGSERIAL PRIMARY KEY,
    job_card_number VARCHAR(60) UNIQUE,
    work_order_number VARCHAR(60),
    part_code VARCHAR(60),
    part_description VARCHAR(255),
    revision VARCHAR(20),
    planned_quantity NUMERIC(18,4),
    completed_quantity NUMERIC(18,4),
    rework_quantity NUMERIC(18,4),
    rejected_quantity NUMERIC(18,4),
    scrap_quantity NUMERIC(18,4),
    priority VARCHAR(20),
    planned_start_date TIMESTAMPTZ,
    planned_end_date TIMESTAMPTZ,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    route_sheet_number VARCHAR(60),
    bom_number VARCHAR(60),
    customer_code VARCHAR(60),
    status VARCHAR(30),
    remarks VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ
);

-- 2. Job Card Subjob
CREATE TABLE IF NOT EXISTS job_card_subjob (
    id BIGSERIAL PRIMARY KEY,
    job_card_id BIGINT REFERENCES job_card(id),
    subjob_number VARCHAR(60),
    operation_code VARCHAR(60),
    operation_description VARCHAR(255),
    sequence_no INT,
    machine_code VARCHAR(60),
    work_center_code VARCHAR(60),
    operator_code VARCHAR(60),
    planned_quantity NUMERIC(18,4),
    completed_quantity NUMERIC(18,4),
    rework_quantity NUMERIC(18,4),
    rejected_quantity NUMERIC(18,4),
    scrap_quantity NUMERIC(18,4),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(30),
    inspection_required BOOLEAN DEFAULT FALSE,
    remarks VARCHAR(500),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- 3. Production Entry
CREATE TABLE IF NOT EXISTS production_entry (
    id BIGSERIAL PRIMARY KEY,
    entry_number VARCHAR(60) UNIQUE,
    work_order_number VARCHAR(60),
    job_card_number VARCHAR(60),
    subjob_number VARCHAR(60),
    part_code VARCHAR(60),
    part_description VARCHAR(255),
    operation_code VARCHAR(60),
    operation_sequence INT,
    machine_code VARCHAR(60),
    operator_code VARCHAR(60),
    shift_code VARCHAR(60),
    production_date TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    produced_quantity NUMERIC(18,4),
    good_quantity NUMERIC(18,4),
    rework_quantity NUMERIC(18,4),
    rejected_quantity NUMERIC(18,4),
    scrap_quantity NUMERIC(18,4),
    status VARCHAR(30),
    quality_status VARCHAR(30),
    remarks VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ
);

-- 4. Product Conversion
CREATE TABLE IF NOT EXISTS product_conversion (
    id BIGSERIAL PRIMARY KEY,
    conversion_number VARCHAR(60) UNIQUE,
    conversion_date TIMESTAMPTZ,
    conversion_type VARCHAR(60),
    source_warehouse VARCHAR(60),
    destination_warehouse VARCHAR(60),
    work_order_number VARCHAR(60),
    job_card_number VARCHAR(60),
    reference VARCHAR(60),
    input_item_code VARCHAR(60),
    input_batch_number VARCHAR(60),
    input_quantity NUMERIC(18,4),
    input_uom VARCHAR(20),
    output_item_code VARCHAR(60),
    output_batch_number VARCHAR(60),
    output_quantity NUMERIC(18,4),
    output_uom VARCHAR(20),
    process_loss_qty NUMERIC(18,4),
    scrap_qty NUMERIC(18,4),
    loss_reason VARCHAR(255),
    status VARCHAR(30),
    remarks VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ
);

-- 5. Production Return
CREATE TABLE IF NOT EXISTS production_return (
    id BIGSERIAL PRIMARY KEY,
    return_number VARCHAR(60) UNIQUE,
    return_date TIMESTAMPTZ,
    work_order_number VARCHAR(60),
    job_card_number VARCHAR(60),
    item_code VARCHAR(60),
    item_description VARCHAR(255),
    batch_number VARCHAR(60),
    quantity NUMERIC(18,4),
    uom VARCHAR(20),
    original_issue_reference VARCHAR(60),
    return_reason VARCHAR(255),
    condition VARCHAR(60),
    warehouse VARCHAR(60),
    location VARCHAR(60),
    status VARCHAR(30),
    remarks VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ
);

-- 6. Production Log Sheet
CREATE TABLE IF NOT EXISTS production_log_sheet (
    id BIGSERIAL PRIMARY KEY,
    log_number VARCHAR(60) UNIQUE,
    log_date TIMESTAMPTZ,
    work_order_number VARCHAR(60),
    job_card_number VARCHAR(60),
    machine_code VARCHAR(60),
    operator_code VARCHAR(60),
    shift_code VARCHAR(60),
    status VARCHAR(30),
    remarks VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ
);

-- 7. Production Log Activity
CREATE TABLE IF NOT EXISTS production_log_activity (
    id BIGSERIAL PRIMARY KEY,
    log_sheet_id BIGINT REFERENCES production_log_sheet(id),
    activity_type VARCHAR(60),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration NUMERIC(18,2),
    quantity NUMERIC(18,4),
    remarks VARCHAR(500),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- 8. Idle Time Entry
CREATE TABLE IF NOT EXISTS idle_time_entry (
    id BIGSERIAL PRIMARY KEY,
    entry_number VARCHAR(60) UNIQUE,
    entry_date TIMESTAMPTZ,
    machine_code VARCHAR(60),
    work_center_code VARCHAR(60),
    operator_code VARCHAR(60),
    shift_code VARCHAR(60),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration NUMERIC(18,2),
    idle_reason VARCHAR(100),
    work_order_number VARCHAR(60),
    job_card_number VARCHAR(60),
    status VARCHAR(30),
    remarks VARCHAR(500),
    version BIGINT DEFAULT 0,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ
);
