-- ============================================================
-- V4: Planning Sub-modules
-- material_plan, material_plan_line,
-- dispatch_plan, dispatch_plan_line,
-- machine_load_plan, machine_load_line,
-- engineering_change,
-- gap_analysis_run, gap_analysis_result,
-- cost_estimation, cost_estimation_line
-- ============================================================

-- -------------------------------------------------------
-- 1. material_plan
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_plan (
    id                BIGSERIAL PRIMARY KEY,
    plan_number       VARCHAR(60)  UNIQUE,
    plan_date         TIMESTAMP,
    planned_by        VARCHAR(60),
    status            VARCHAR(30),
    remarks           VARCHAR(500),
    parameters_json   TEXT,

    version           BIGINT       DEFAULT 0,
    created_by        VARCHAR(100),
    created_at        TIMESTAMP,
    updated_by        VARCHAR(100),
    updated_at        TIMESTAMP
);

-- -------------------------------------------------------
-- 2. material_plan_line
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_plan_line (
    id                     BIGSERIAL PRIMARY KEY,
    plan_id                BIGINT       NOT NULL,
    item_code              VARCHAR(60),
    item_description       VARCHAR(200),
    uom                    VARCHAR(20),
    bom_level              INTEGER,
    source_wo_number       VARCHAR(100),
    gross_requirement      DECIMAL(38,2),
    on_hand_stock          DECIMAL(38,2),
    on_order_qty           DECIMAL(38,2),
    wip_qty                DECIMAL(38,2),
    safety_stock           DECIMAL(38,2),
    net_requirement        DECIMAL(38,2),
    recommended_order_qty  DECIMAL(38,2),
    order_type             VARCHAR(30),
    required_date          TIMESTAMP,
    order_by_date          TIMESTAMP,
    lead_time_days         INTEGER,
    estimated_cost         DECIMAL(38,2),
    action_status          VARCHAR(30),
    remarks                VARCHAR(200),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 3. dispatch_plan
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispatch_plan (
    id                BIGSERIAL PRIMARY KEY,
    dispatch_number   VARCHAR(60)  UNIQUE,
    dispatch_date     TIMESTAMP,
    customer_id       BIGINT,
    customer_name     VARCHAR(200),
    delivery_address  VARCHAR(500),
    transport_mode    VARCHAR(50),
    transporter_name  VARCHAR(200),
    vehicle_number    VARCHAR(30),
    lr_number         VARCHAR(50),
    eway_bill_number  VARCHAR(50),
    status            VARCHAR(30),
    total_items       INTEGER,
    total_qty         DECIMAL(38,2),
    total_weight      DECIMAL(8,2),
    remarks           VARCHAR(500),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 4. dispatch_plan_line
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispatch_plan_line (
    id                BIGSERIAL PRIMARY KEY,
    dispatch_plan_id  BIGINT,
    so_number         VARCHAR(60),
    so_line_id        BIGINT,
    wo_number         VARCHAR(60),
    item_code         VARCHAR(60),
    item_description  VARCHAR(200),
    dispatch_qty      DECIMAL(38,2),
    uom               VARCHAR(20),
    batch_lot_number  VARCHAR(60),
    packing_type      VARCHAR(30),
    number_of_packages INTEGER,
    weight_kg         DECIMAL(8,2),
    status            VARCHAR(30),
    remarks           VARCHAR(200),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 5. machine_load_plan
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS machine_load_plan (
    id              BIGSERIAL PRIMARY KEY,
    plan_number     VARCHAR(60)  UNIQUE NOT NULL,
    plan_start_date TIMESTAMP,
    plan_end_date   TIMESTAMP,
    generated_date  TIMESTAMP,
    generated_by    VARCHAR(100),
    status          VARCHAR(30),
    remarks         VARCHAR(500),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 6. machine_load_line
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS machine_load_line (
    id                   BIGSERIAL PRIMARY KEY,
    load_plan_id         BIGINT       NOT NULL,
    machine_code         VARCHAR(60),
    work_center_code     VARCHAR(60),
    load_date            TIMESTAMP,
    shift_name           VARCHAR(30),
    available_hours      DECIMAL(6,2),
    planned_load_hours   DECIMAL(6,2),
    utilization_percent  DECIMAL(5,2),
    is_overloaded        BOOLEAN      DEFAULT FALSE,
    overload_hours       DECIMAL(6,2),
    wo_number            VARCHAR(60),
    operation_sequence   INTEGER,
    wo_operation_code    VARCHAR(60),
    setup_hours          DECIMAL(6,2),
    run_hours            DECIMAL(6,2),
    sequence_on_machine  INTEGER,
    remarks              VARCHAR(200),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 7. engineering_change
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS engineering_change (
    id                    BIGSERIAL PRIMARY KEY,
    ecr_number            VARCHAR(60)   UNIQUE NOT NULL,
    eco_number            VARCHAR(60),
    change_type           VARCHAR(30),
    item_code             VARCHAR(60),
    item_description      VARCHAR(200),
    current_revision      VARCHAR(30),
    proposed_revision     VARCHAR(30),
    description_of_change VARCHAR(1000),
    reason_for_change     VARCHAR(500),
    priority              VARCHAR(30),
    status                VARCHAR(30),
    bom_impact            BOOLEAN       DEFAULT FALSE,
    route_impact          BOOLEAN       DEFAULT FALSE,
    quality_impact        BOOLEAN       DEFAULT FALSE,
    inventory_impact      BOOLEAN       DEFAULT FALSE,
    effective_date        TIMESTAMP,
    bom_rev_from          VARCHAR(30),
    bom_rev_to            VARCHAR(30),
    route_rev_from        VARCHAR(30),
    route_rev_to          VARCHAR(30),
    drawing_rev_from      VARCHAR(30),
    drawing_rev_to        VARCHAR(30),
    requested_by          VARCHAR(100),
    reviewed_by           VARCHAR(100),
    approved_by           VARCHAR(100),
    remarks               VARCHAR(500),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 8. gap_analysis_run
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS gap_analysis_run (
    id                      BIGSERIAL PRIMARY KEY,
    run_number              VARCHAR(60)  UNIQUE NOT NULL,
    analysis_date           TIMESTAMP,
    planning_horizon_start  TIMESTAMP,
    planning_horizon_end    TIMESTAMP,
    scope                   VARCHAR(30)  NOT NULL,
    scope_value             VARCHAR(200),
    generated_by            VARCHAR(100),
    status                  VARCHAR(20)  NOT NULL,
    remarks                 VARCHAR(500),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 9. gap_analysis_result
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS gap_analysis_result (
    id                   BIGSERIAL PRIMARY KEY,
    run_id               BIGINT        NOT NULL,
    gap_type             VARCHAR(30)   NOT NULL,
    context_code         VARCHAR(100),
    context_description  VARCHAR(200),
    demand_qty           DECIMAL(38,2),
    supply_qty           DECIMAL(38,2),
    gap_qty              DECIMAL(38,2),
    gap_value            DECIMAL(38,2),
    gap_days             INTEGER,
    severity             VARCHAR(20)   NOT NULL,
    root_cause           VARCHAR(500),
    suggested_action     VARCHAR(500),
    action_status        VARCHAR(30),
    resolved_by          VARCHAR(100),
    resolved_date        TIMESTAMP,
    remarks              VARCHAR(200),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 10. cost_estimation
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS cost_estimation (
    id                      BIGSERIAL PRIMARY KEY,
    estimation_number       VARCHAR(60)   UNIQUE NOT NULL,
    item_code               VARCHAR(60),
    item_description        VARCHAR(200),
    customer_name           VARCHAR(200),
    so_number               VARCHAR(60),
    batch_qty               DECIMAL(38,2),
    bom_id                  BIGINT,
    route_id                BIGINT,
    estimation_version      INTEGER,
    status                  VARCHAR(20)   NOT NULL,
    currency_code           VARCHAR(10),
    exchange_rate           DECIMAL(10,4),
    total_material_cost     DECIMAL(38,2),
    total_machine_cost      DECIMAL(38,2),
    total_labour_cost       DECIMAL(38,2),
    total_tooling_cost      DECIMAL(38,2),
    total_subcontract_cost  DECIMAL(38,2),
    total_overhead_cost     DECIMAL(38,2),
    scrap_allowance_cost    DECIMAL(38,2),
    total_manufacturing_cost DECIMAL(38,2),
    profit_margin_percent   DECIMAL(5,2),
    profit_amount           DECIMAL(38,2),
    estimated_selling_price DECIMAL(38,2),
    valid_upto              TIMESTAMP,
    prepared_by             VARCHAR(100),
    approved_by             VARCHAR(100),
    remarks                 VARCHAR(500),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);

-- -------------------------------------------------------
-- 11. cost_estimation_line
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS cost_estimation_line (
    id                   BIGSERIAL PRIMARY KEY,
    estimation_id        BIGINT        NOT NULL,
    line_type            VARCHAR(20)   NOT NULL,
    component_item_code  VARCHAR(60),
    component_name       VARCHAR(200),
    op_sequence          INTEGER,
    operation_name       VARCHAR(200),
    machine_code         VARCHAR(60),
    qty_required         DECIMAL(38,2),
    rate_per_unit        DECIMAL(38,2),
    amount               DECIMAL(38,2),
    machine_hour_rate    DECIMAL(38,2),
    setup_time_hrs       DECIMAL(8,2),
    cycle_time_hrs       DECIMAL(8,2),
    total_time_hrs       DECIMAL(8,2),
    machine_cost         DECIMAL(38,2),
    labour_hours         DECIMAL(8,2),
    labour_rate          DECIMAL(38,2),
    labour_cost          DECIMAL(38,2),
    tooling_cost         DECIMAL(38,2),
    is_subcontract       BOOLEAN       DEFAULT FALSE,
    subcontract_rate     DECIMAL(38,2),
    subcontract_cost     DECIMAL(38,2),
    source_rate          VARCHAR(20),
    remarks              VARCHAR(200),

    version     BIGINT       DEFAULT 0,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP,
    updated_by  VARCHAR(100),
    updated_at  TIMESTAMP
);
