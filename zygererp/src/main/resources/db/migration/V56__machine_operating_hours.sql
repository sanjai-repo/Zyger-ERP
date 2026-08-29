-- §10.3 Real operating hours per machine per day, fed from Production (populateOeeDaily).
CREATE TABLE machine_operating_hours (
    id              BIGSERIAL PRIMARY KEY,
    machine_code    VARCHAR(60)  NOT NULL,
    work_date       DATE         NOT NULL,
    operating_hours NUMERIC(10,2) NOT NULL,
    source          VARCHAR(30)  NOT NULL DEFAULT 'PRODUCTION',
    plant_id        BIGINT,
    created_by      VARCHAR(60),
    created_at      TIMESTAMP,
    CONSTRAINT uq_moh_machine_date UNIQUE (machine_code, work_date)
);

CREATE INDEX idx_moh_machine_date ON machine_operating_hours (machine_code, work_date);