-- V8: Maintenance Analysis & RCA table

CREATE TABLE root_cause_analysis (
    id BIGSERIAL PRIMARY KEY,
    rca_number VARCHAR(60) UNIQUE NOT NULL,
    machine_code VARCHAR(60),
    breakdown_id BIGINT REFERENCES breakdown_intimation(id),
    breakdown_number VARCHAR(60),
    problem_description TEXT,
    immediate_cause TEXT,
    root_cause TEXT,
    contributing_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    responsible_person VARCHAR(60),
    target_date DATE,
    verification_date DATE,
    verified_by VARCHAR(60),
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

CREATE INDEX idx_rca_machine ON root_cause_analysis(machine_code);
CREATE INDEX idx_rca_breakdown ON root_cause_analysis(breakdown_id);
CREATE INDEX idx_rca_status ON root_cause_analysis(status);
