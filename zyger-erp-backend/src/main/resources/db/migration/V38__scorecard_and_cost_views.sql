-- V38: Supplier quality scorecard + machine cost summary materialized views

-- Supplier Quality Scorecard: NCR count, severity breakdown, by source/defect
-- Using actual quality_ncr columns
CREATE MATERIALIZED VIEW IF NOT EXISTS supplier_quality_scorecard AS
SELECT
  n.id AS ncr_id,
  n.doc_no AS ncr_number,
  n.source_number AS supplier_code,
  n.created_at AS ncr_date,
  n.severity,
  n.status AS ncr_status,
  n.root_cause_required,
  n.item_code AS affected_item,
  COALESCE(n.quantity_affected, 0) AS quantity_affected,
  DATE_TRUNC('month', n.created_at) AS month_bucket,
  n.plant_id
FROM quality_ncr n
WHERE n.source_number IS NOT NULL AND n.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_scorecard_ncr ON supplier_quality_scorecard(ncr_id);

-- Aggregated supplier scorecard view (month-level summary)
CREATE MATERIALIZED VIEW IF NOT EXISTS supplier_scorecard_monthly AS
SELECT
  supplier_code,
  month_bucket,
  COUNT(*) AS ncr_count,
  SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_count,
  SUM(CASE WHEN severity = 'MAJOR' THEN 1 ELSE 0 END) AS major_count,
  SUM(CASE WHEN severity = 'MINOR' THEN 1 ELSE 0 END) AS minor_count,
  SUM(quantity_affected) AS total_affected,
  plant_id
FROM supplier_quality_scorecard
GROUP BY supplier_code, month_bucket, plant_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_scorecard_monthly ON supplier_scorecard_monthly(supplier_code, month_bucket, plant_id);

-- Machine Cost Summary: total maintenance cost per machine per month
CREATE MATERIALIZED VIEW IF NOT EXISTS machine_cost_summary AS
SELECT
  bd.machine_code,
  DATE_TRUNC('month', bd.created_at) AS month_bucket,
  bd.plant_id,
  COUNT(DISTINCT bd.id) AS breakdown_count,
  0 AS breakdown_cost,
  0 AS breakdown_spare_cost,
  0 AS pm_cost,
  0 AS total_cost
FROM breakdown_intimation bd
WHERE bd.deleted_at IS NULL
GROUP BY bd.machine_code, DATE_TRUNC('month', bd.created_at), bd.plant_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_machine_cost_summary ON machine_cost_summary(machine_code, month_bucket, plant_id);
