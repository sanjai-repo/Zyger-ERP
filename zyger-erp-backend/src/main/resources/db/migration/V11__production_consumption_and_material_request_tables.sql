--
-- V11__production_consumption_and_material_request_tables.sql
-- P14-R1 / F2 (DOCUMENT_64 F2) — Production Consumption sub-schema missing from Flyway.
--
-- INVENTORY DRIVEN BY THE AUDIT: the committed application model defines four
-- P6-owned tables that NO migration creates (all other production tables already
-- exist in V1..V10):
--   * prod_consumption      (ProductionConsumption)
--   * prod_consumption_line (ProductionConsumptionLine)
--   * prod_req_material     (ProdReqMaterial)      — upstream of consumption
--   * prod_req_material_line (ProdReqMaterialLine)  — upstream of consumption
--
-- Root cause: these entities were added after the V1 baseline dump and, with
-- spring.flyway.enabled=false in the default/dev profile, their schema existed
-- only via Hibernate auto-DDL (ddl-auto: update). Staging/prod run Flyway with
-- ddl-auto: validate, so the missing tables fail boot. The Consumption sub-schema
-- (F2) and its upstream Material Request pair (same root-cause class, same P6
-- chain: ISSUE -> allotment reservation -> consumption POST) are created here as
-- the SMALLEST safe additive migration.
--
-- SCOPE: Additive only. Column-for-column mirror of the JPA entities (names,
-- types, precision/scale, nullability, unique/FK constraints). No redesign of
-- Production Consumption, no change to P6 behavior, no change to Inventory
-- schema, no DDL on any existing table.
--
-- SAFETY on partially-created (non-Flyway) databases: IF NOT EXISTS / plain
-- CREATE (no DROP, TRUNCATE or DELETE); a pre-existing identical table is left
-- untouched.
--
SET search_path TO public;

-- ---------------------------------------------------------------------------
-- 1. prod_consumption — P6 Consumption header (NUM-PROD-CONSUME, PC-...)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_consumption (
    id                   BIGSERIAL PRIMARY KEY,
    consumption_no       VARCHAR(60),
    job_card_id          BIGINT,
    job_card_number      VARCHAR(60),
    work_order_number    VARCHAR(60),
    material_request_no  VARCHAR(60),
    consumption_date     DATE,
    status               VARCHAR(30),
    posted_at            TIMESTAMP(6) WITH TIME ZONE,
    remarks              VARCHAR(500),
    version              BIGINT,
    created_by           VARCHAR(60),
    created_at           TIMESTAMP(6) WITH TIME ZONE,
    updated_by           VARCHAR(60),
    updated_at           TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uq_prod_consumption_consumption_no UNIQUE (consumption_no)
);

-- ---------------------------------------------------------------------------
-- 2. prod_consumption_line — P6 Consumption lines (FK to header)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_consumption_line (
    id                BIGSERIAL PRIMARY KEY,
    consumption_id    BIGINT,
    item_code         VARCHAR(60),
    item_description  VARCHAR(255),
    issued_qty        NUMERIC(18,4),
    consumed_qty      NUMERIC(18,4),
    return_qty        NUMERIC(18,4),
    scrap_qty         NUMERIC(18,4),
    batch_number      VARCHAR(40),
    uom               VARCHAR(20),
    location          VARCHAR(60),
    line_remarks      VARCHAR(500),
    CONSTRAINT fk_prod_consumption_line_consumption FOREIGN KEY (consumption_id)
        REFERENCES prod_consumption (id)
);

CREATE INDEX IF NOT EXISTS idx_prod_consumption_line_consumption
    ON prod_consumption_line (consumption_id);

-- ---------------------------------------------------------------------------
-- 3. prod_req_material — P6 Material Request header (NUM-PROD-MATERIAL, PM-...)
--    Upstream of the Consumption chain; same migration-gap root cause as F2.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_req_material (
    id                 BIGSERIAL PRIMARY KEY,
    req_no             VARCHAR(60),
    job_card_id        BIGINT,
    job_card_number    VARCHAR(60),
    work_order_number  VARCHAR(60),
    req_date           DATE,
    status             VARCHAR(30),
    requested_by       VARCHAR(60),
    remarks            VARCHAR(500),
    issued_at          TIMESTAMP(6) WITH TIME ZONE,
    closed_at          TIMESTAMP(6) WITH TIME ZONE,
    version            BIGINT,
    created_by         VARCHAR(60),
    created_at         TIMESTAMP(6) WITH TIME ZONE,
    updated_by         VARCHAR(60),
    updated_at         TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uq_prod_req_material_req_no UNIQUE (req_no)
);

-- ---------------------------------------------------------------------------
-- 4. prod_req_material_line — P6 Material Request lines (FK to header)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_req_material_line (
    id               BIGSERIAL PRIMARY KEY,
    req_id           BIGINT,
    item_code        VARCHAR(60),
    item_description VARCHAR(255),
    required_qty     NUMERIC(18,4),
    issued_qty       NUMERIC(18,4),
    uom              VARCHAR(20),
    store_code       VARCHAR(60),
    rack             VARCHAR(20),
    bin              VARCHAR(20),
    lot              VARCHAR(40),
    batch_number     VARCHAR(40),
    line_remarks     VARCHAR(500),
    CONSTRAINT fk_prod_req_material_line_request FOREIGN KEY (req_id)
        REFERENCES prod_req_material (id)
);

CREATE INDEX IF NOT EXISTS idx_prod_req_material_line_request
    ON prod_req_material_line (req_id);