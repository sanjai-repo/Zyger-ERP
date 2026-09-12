-- PHASE 2 — Isolated production operation execution event table.
--
-- DELIBERATELY a NEW, isolated table (prod_operation_execution_event) rather
-- than reusing the committed prod_operation_event (which is created by V4 and
-- mapped by the committed ProdOperationEvent entity). This avoids any Flyway
-- version collision (V2 already exists) and any JPA duplicate-entity mapping.
--
-- No legacy tables are touched. No StockService interaction.

CREATE TABLE IF NOT EXISTS prod_operation_execution_event (
    id                     UUID PRIMARY KEY,
    company_id             VARCHAR(60),
    plant_id               VARCHAR(60),
    status                 VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_by             VARCHAR(60),
    created_at             TIMESTAMP NOT NULL DEFAULT now(),
    version                BIGINT NOT NULL DEFAULT 0,
    work_order_number      VARCHAR(60),
    route_sheet_no         VARCHAR(60),
    operation_id           VARCHAR(60),
    machine_id             VARCHAR(60),
    operator_id            VARCHAR(60),
    shift_id               VARCHAR(60),
    actual_start_date_time TIMESTAMP,
    actual_end_date_time   TIMESTAMP,
    processed_qty          NUMERIC(18,4),
    accepted_qty           NUMERIC(18,4),
    rejected_qty           NUMERIC(18,4),
    rework_qty             NUMERIC(18,4),
    scrap_qty              NUMERIC(18,4)
);

CREATE INDEX IF NOT EXISTS idx_prod_ope_exec_work_order ON prod_operation_execution_event(work_order_number);
CREATE INDEX IF NOT EXISTS idx_prod_ope_exec_status       ON prod_operation_execution_event(status);
