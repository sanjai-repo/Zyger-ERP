-- BR-12: cost rows on a CLOSED transaction are immutable; corrections use adjustment records.
CREATE TABLE maintenance_cost_adjustment (
    id                 BIGSERIAL PRIMARY KEY,
    cost_transaction_id BIGINT NOT NULL REFERENCES maintenance_cost_transaction(id),
    parent_type        VARCHAR(30),
    parent_id          BIGINT,
    parent_number      VARCHAR(60),
    machine_code       VARCHAR(60),
    adjustment_type    VARCHAR(20) NOT NULL DEFAULT 'ADJUST',
    delta_amount       NUMERIC(14,4) NOT NULL,
    reason             TEXT,
    posted_by          VARCHAR(60),
    posted_at          TIMESTAMP NOT NULL
);

CREATE INDEX idx_mca_cost_transaction ON maintenance_cost_adjustment (cost_transaction_id);
CREATE INDEX idx_mca_parent ON maintenance_cost_adjustment (parent_type, parent_id);