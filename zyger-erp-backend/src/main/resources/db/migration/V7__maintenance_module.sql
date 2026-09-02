-- V7: Maintenance Module
-- 11 tables for Breakdown, PM, Tools, Calibration, Utilities

-- 1. BREAKDOWN INTIMATION
CREATE TABLE breakdown_intimation (
    id BIGSERIAL PRIMARY KEY,
    breakdown_number VARCHAR(60) UNIQUE NOT NULL,
    breakdown_date DATE,
    breakdown_time TIME,
    machine_code VARCHAR(60),
    machine_status VARCHAR(30),
    reported_by VARCHAR(60),
    operator_code VARCHAR(60),
    shift_code VARCHAR(60),
    breakdown_category VARCHAR(60),
    cnc_alarm_code VARCHAR(60),
    problem_description TEXT,
    production_impact VARCHAR(30),
    priority VARCHAR(20),
    status VARCHAR(30) DEFAULT 'OPEN',
    breakdown_start_time TIMESTAMPTZ,
    assigned_to VARCHAR(60),
    diagnosis TEXT,
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 2. BREAKDOWN RECTIFICATION
CREATE TABLE breakdown_rectification (
    id BIGSERIAL PRIMARY KEY,
    rectification_number VARCHAR(60) UNIQUE NOT NULL,
    breakdown_id BIGINT REFERENCES breakdown_intimation(id),
    breakdown_number VARCHAR(60),
    machine_code VARCHAR(60),
    technician_code VARCHAR(60),
    failure_cause TEXT,
    corrective_action TEXT,
    spare_parts_used TEXT,
    labour_hours NUMERIC(10,2),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    downtime_minutes NUMERIC(10,2),
    external_vendor VARCHAR(120),
    service_cost NUMERIC(18,2) DEFAULT 0,
    testing_result VARCHAR(30),
    status VARCHAR(30) DEFAULT 'IN_PROGRESS',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 3. PM PLAN
CREATE TABLE pm_plan (
    id BIGSERIAL PRIMARY KEY,
    plan_number VARCHAR(60) UNIQUE NOT NULL,
    machine_code VARCHAR(60),
    maintenance_type VARCHAR(60),
    frequency VARCHAR(30),
    responsible_department VARCHAR(60),
    responsible_technician VARCHAR(60),
    estimated_duration_hours NUMERIC(10,2),
    checklist_items TEXT,
    required_spare_parts TEXT,
    required_tools TEXT,
    safety_instructions TEXT,
    instructions TEXT,
    last_maintenance_date DATE,
    next_due_date DATE,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 4. PM SCHEDULE
CREATE TABLE pm_schedule (
    id BIGSERIAL PRIMARY KEY,
    schedule_number VARCHAR(60) UNIQUE NOT NULL,
    plan_id BIGINT REFERENCES pm_plan(id),
    plan_number VARCHAR(60),
    machine_code VARCHAR(60),
    scheduled_date DATE,
    due_date DATE,
    completed_date DATE,
    assigned_to VARCHAR(60),
    status VARCHAR(30) DEFAULT 'UPCOMING',
    priority VARCHAR(20),
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 5. PM COMPLETION
CREATE TABLE pm_completion (
    id BIGSERIAL PRIMARY KEY,
    completion_number VARCHAR(60) UNIQUE NOT NULL,
    schedule_id BIGINT REFERENCES pm_schedule(id),
    schedule_number VARCHAR(60),
    plan_number VARCHAR(60),
    machine_code VARCHAR(60),
    technician_code VARCHAR(60),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_hours NUMERIC(10,2),
    checklist_completed TEXT,
    measurements_recorded TEXT,
    spare_parts_used TEXT,
    labour_hours NUMERIC(10,2),
    result VARCHAR(30),
    supervisor VARCHAR(60),
    verified BOOLEAN DEFAULT FALSE,
    next_due_date DATE,
    status VARCHAR(30) DEFAULT 'DRAFT',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 6. TOOL SERVICE INTIMATION
CREATE TABLE tool_service_intimation (
    id BIGSERIAL PRIMARY KEY,
    service_number VARCHAR(60) UNIQUE NOT NULL,
    tool_id VARCHAR(60),
    tool_type VARCHAR(60),
    tool_description VARCHAR(255),
    tool_serial_number VARCHAR(60),
    current_location VARCHAR(60),
    reported_by VARCHAR(60),
    service_date DATE,
    problem_description TEXT,
    service_reason VARCHAR(120),
    tool_condition VARCHAR(30),
    priority VARCHAR(20),
    vendor VARCHAR(120),
    status VARCHAR(30) DEFAULT 'OPEN',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 7. TOOL SERVICE RECTIFICATION
CREATE TABLE tool_service_rectification (
    id BIGSERIAL PRIMARY KEY,
    rectification_number VARCHAR(60) UNIQUE NOT NULL,
    service_id BIGINT REFERENCES tool_service_intimation(id),
    service_number VARCHAR(60),
    tool_id VARCHAR(60),
    technician_code VARCHAR(60),
    root_cause TEXT,
    corrective_action TEXT,
    service_start TIMESTAMPTZ,
    service_end TIMESTAMPTZ,
    parts_used TEXT,
    service_cost NUMERIC(18,2) DEFAULT 0,
    tool_condition_after VARCHAR(30),
    result VARCHAR(30),
    status VARCHAR(30) DEFAULT 'IN_PROGRESS',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 8. CALIBRATION SCHEDULE
CREATE TABLE calibration_schedule (
    id BIGSERIAL PRIMARY KEY,
    schedule_number VARCHAR(60) UNIQUE NOT NULL,
    instrument_id VARCHAR(60),
    instrument_name VARCHAR(120),
    serial_number VARCHAR(60),
    range_value VARCHAR(60),
    accuracy VARCHAR(60),
    location VARCHAR(60),
    department VARCHAR(60),
    calibration_frequency VARCHAR(30),
    last_calibration_date DATE,
    next_due_date DATE,
    calibration_agency VARCHAR(120),
    calibration_status VARCHAR(30) DEFAULT 'VALID',
    status VARCHAR(30) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 9. CALIBRATION ENTRY
CREATE TABLE calibration_entry (
    id BIGSERIAL PRIMARY KEY,
    calibration_number VARCHAR(60) UNIQUE NOT NULL,
    schedule_id BIGINT REFERENCES calibration_schedule(id),
    schedule_number VARCHAR(60),
    instrument_id VARCHAR(60),
    instrument_name VARCHAR(120),
    calibration_date DATE,
    calibration_agency VARCHAR(120),
    certificate_number VARCHAR(60),
    standard_used VARCHAR(120),
    observed_values TEXT,
    permissible_limits TEXT,
    result VARCHAR(30),
    next_due_date DATE,
    calibration_cost NUMERIC(18,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'DRAFT',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 10. POWER CONSUMPTION
CREATE TABLE power_consumption (
    id BIGSERIAL PRIMARY KEY,
    entry_number VARCHAR(60) UNIQUE NOT NULL,
    reading_date DATE,
    machine_code VARCHAR(60),
    meter_number VARCHAR(60),
    opening_reading NUMERIC(18,2) DEFAULT 0,
    closing_reading NUMERIC(18,2) DEFAULT 0,
    consumption NUMERIC(18,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'kWh',
    shift_code VARCHAR(60),
    department VARCHAR(60),
    status VARCHAR(30) DEFAULT 'DRAFT',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- 11. WATER CONSUMPTION
CREATE TABLE water_consumption (
    id BIGSERIAL PRIMARY KEY,
    entry_number VARCHAR(60) UNIQUE NOT NULL,
    reading_date DATE,
    meter_number VARCHAR(60),
    opening_reading NUMERIC(18,2) DEFAULT 0,
    closing_reading NUMERIC(18,2) DEFAULT 0,
    consumption NUMERIC(18,2) DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'Liters',
    department VARCHAR(60),
    usage_type VARCHAR(30),
    shift_code VARCHAR(60),
    status VARCHAR(30) DEFAULT 'DRAFT',
    remarks TEXT,
    created_by VARCHAR(60),
    created_at TIMESTAMPTZ,
    updated_by VARCHAR(60),
    updated_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by VARCHAR(60)
);

-- Indexes for performance
CREATE INDEX idx_bd_intimation_machine ON breakdown_intimation(machine_code);
CREATE INDEX idx_bd_intimation_status ON breakdown_intimation(status);
CREATE INDEX idx_bd_intimation_date ON breakdown_intimation(breakdown_date);
CREATE INDEX idx_bd_rectification_breakdown ON breakdown_rectification(breakdown_id);
CREATE INDEX idx_pm_plan_machine ON pm_plan(machine_code);
CREATE INDEX idx_pm_plan_next_due ON pm_plan(next_due_date);
CREATE INDEX idx_pm_schedule_due ON pm_schedule(due_date);
CREATE INDEX idx_pm_schedule_machine ON pm_schedule(machine_code);
CREATE INDEX idx_pm_schedule_status ON pm_schedule(status);
CREATE INDEX idx_pm_completion_schedule ON pm_completion(schedule_id);
CREATE INDEX idx_tool_service_tool ON tool_service_intimation(tool_id);
CREATE INDEX idx_tool_service_status ON tool_service_intimation(status);
CREATE INDEX idx_tool_rect_service ON tool_service_rectification(service_id);
CREATE INDEX idx_cal_schedule_instrument ON calibration_schedule(instrument_id);
CREATE INDEX idx_cal_schedule_next_due ON calibration_schedule(next_due_date);
CREATE INDEX idx_cal_schedule_status ON calibration_schedule(calibration_status);
CREATE INDEX idx_cal_entry_schedule ON calibration_entry(schedule_id);
CREATE INDEX idx_power_machine ON power_consumption(machine_code);
CREATE INDEX idx_power_date ON power_consumption(reading_date);
CREATE INDEX idx_water_meter ON water_consumption(meter_number);
CREATE INDEX idx_water_date ON water_consumption(reading_date);
