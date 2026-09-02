-- P0-C3/C4: Stock Balance table (denormalized for fast queries) + stock status on ledger
-- Per FRS INV-LDG-02, INV-ARCH-03/04, GBL-12

CREATE TABLE IF NOT EXISTS stock_balance (
    id BIGSERIAL PRIMARY KEY,
    item_code VARCHAR(60) NOT NULL,
    location VARCHAR(60) NOT NULL,
    batch_no VARCHAR(60) NOT NULL DEFAULT '',
    heat_no VARCHAR(60) NOT NULL DEFAULT '',
    stock_status VARCHAR(30) NOT NULL DEFAULT 'FREE',
    qty NUMERIC(18,4) NOT NULL DEFAULT 0,
    CONSTRAINT uq_stock_balance_key UNIQUE (item_code, location, batch_no, heat_no, stock_status)
);

CREATE INDEX IF NOT EXISTS idx_sb_item_loc ON stock_balance(item_code, location);
CREATE INDEX IF NOT EXISTS idx_sb_item_status ON stock_balance(item_code, stock_status);
CREATE INDEX IF NOT EXISTS idx_sb_item_loc_batch ON stock_balance(item_code, location, batch_no);

-- Add stock_status to stock_ledger
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS stock_status VARCHAR(30) DEFAULT 'FREE';
CREATE INDEX IF NOT EXISTS idx_ledger_item_status ON stock_ledger(item_code, stock_status);

-- Backfill stock_balance from existing ledger (aggregated per item/location/batch/heat)
INSERT INTO stock_balance (item_code, location, batch_no, heat_no, stock_status, qty)
SELECT item_code,
       COALESCE(location, ''),
       COALESCE(batch_no, ''),
       COALESCE(heat_no, ''),
       'FREE',
       SUM(COALESCE(in_qty, 0)) - SUM(COALESCE(out_qty, 0))
FROM stock_ledger
GROUP BY item_code, COALESCE(location, ''), COALESCE(batch_no, ''), COALESCE(heat_no, '')
HAVING SUM(COALESCE(in_qty, 0)) - SUM(COALESCE(out_qty, 0)) > 0
ON CONFLICT (item_code, location, batch_no, heat_no, stock_status) DO UPDATE SET qty = EXCLUDED.qty;
