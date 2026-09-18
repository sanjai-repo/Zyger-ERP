-- Planning Module Phase 3: Cost Estimation dimension costing, efficiency factor, versioning and flexible rollup (FRS §10/§22)

-- Header: costing basis, references, process-rate toggle, profit/makeup/discount/round-off, versioning link
ALTER TABLE cost_estimation ADD COLUMN rate_from VARCHAR(30);
ALTER TABLE cost_estimation ADD COLUMN reference_screen VARCHAR(60);
ALTER TABLE cost_estimation ADD COLUMN reference_no VARCHAR(60);
ALTER TABLE cost_estimation ADD COLUMN product_image_url VARCHAR(500);
ALTER TABLE cost_estimation ADD COLUMN process_rate_applicable BOOLEAN DEFAULT TRUE;
ALTER TABLE cost_estimation ADD COLUMN profit_from VARCHAR(20) DEFAULT 'TOTAL';
ALTER TABLE cost_estimation ADD COLUMN makeup_percent NUMERIC(5,2);
ALTER TABLE cost_estimation ADD COLUMN makeup_amount NUMERIC(38,2);
ALTER TABLE cost_estimation ADD COLUMN discount_percent NUMERIC(5,2);
ALTER TABLE cost_estimation ADD COLUMN net_cost NUMERIC(38,2);
ALTER TABLE cost_estimation ADD COLUMN other_cost_amount NUMERIC(38,2);
ALTER TABLE cost_estimation ADD COLUMN round_off BOOLEAN DEFAULT FALSE;
ALTER TABLE cost_estimation ADD COLUMN prior_version_id BIGINT;

-- Item Detail: alternate UOM, conversion, scrap recovery, dimension-based quantity
ALTER TABLE cost_estimation_line ADD COLUMN item_name VARCHAR(200);
ALTER TABLE cost_estimation_line ADD COLUMN stock_uom VARCHAR(20);
ALTER TABLE cost_estimation_line ADD COLUMN conversion_ratio NUMERIC(18,6);
ALTER TABLE cost_estimation_line ADD COLUMN alternate_uom VARCHAR(20);
ALTER TABLE cost_estimation_line ADD COLUMN bom_qty_alt_uom NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN bom_qty_stock_uom NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN rate_stock_uom NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN rate_alt_uom NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN product_amount NUMERIC(38,2);
ALTER TABLE cost_estimation_line ADD COLUMN scrap_qty NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN scrap_rate NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN scrap_amount NUMERIC(38,2);
ALTER TABLE cost_estimation_line ADD COLUMN thickness NUMERIC(18,6);
ALTER TABLE cost_estimation_line ADD COLUMN width NUMERIC(18,6);
ALTER TABLE cost_estimation_line ADD COLUMN length NUMERIC(18,6);
ALTER TABLE cost_estimation_line ADD COLUMN dimension_uom VARCHAR(20);
ALTER TABLE cost_estimation_line ADD COLUMN density_factor NUMERIC(18,8);

-- Process Detail: efficiency, rates and times
ALTER TABLE cost_estimation_line ADD COLUMN efficiency_pct NUMERIC(6,2);
ALTER TABLE cost_estimation_line ADD COLUMN batch_qty NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN qty NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN process_cost NUMERIC(38,2);
ALTER TABLE cost_estimation_line ADD COLUMN setup_rate_hr NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN ins_rate_hr NUMERIC(38,6);
ALTER TABLE cost_estimation_line ADD COLUMN process_time_min NUMERIC(18,4);
ALTER TABLE cost_estimation_line ADD COLUMN setup_time_min NUMERIC(18,4);
ALTER TABLE cost_estimation_line ADD COLUMN ins_time_min NUMERIC(18,4);

-- Other Cost lines
ALTER TABLE cost_estimation_line ADD COLUMN other_basis VARCHAR(20);
ALTER TABLE cost_estimation_line ADD COLUMN other_percent NUMERIC(6,2);
ALTER TABLE cost_estimation_line ADD COLUMN other_type VARCHAR(10);
ALTER TABLE cost_estimation_line ADD COLUMN other_description VARCHAR(200);