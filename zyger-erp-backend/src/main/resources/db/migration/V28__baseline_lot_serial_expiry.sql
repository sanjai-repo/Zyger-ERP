DO $$ BEGIN
    -- Add lot_no, serial_no, expiry_date to all BaseLine-derived tables
    -- Find all tables with batch_no column (they're all BaseLine-derived)
    PERFORM 1;
    -- We'll use a dynamic approach since there are 30+ BaseLine tables
    -- For safety, add to the most critical ones explicitly
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_order_line' AND column_name = 'batch_no') THEN
        ALTER TABLE purchase_order_line ADD COLUMN IF NOT EXISTS lot_no VARCHAR(60);
        ALTER TABLE purchase_order_line ADD COLUMN IF NOT EXISTS serial_no VARCHAR(60);
        ALTER TABLE purchase_order_line ADD COLUMN IF NOT EXISTS expiry_date DATE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_order_line' AND column_name = 'batch_no') THEN
        ALTER TABLE sales_order_line ADD COLUMN IF NOT EXISTS lot_no VARCHAR(60);
        ALTER TABLE sales_order_line ADD COLUMN IF NOT EXISTS serial_no VARCHAR(60);
        ALTER TABLE sales_order_line ADD COLUMN IF NOT EXISTS expiry_date DATE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_balance' AND column_name = 'batch_no') THEN
        ALTER TABLE stock_balance ADD COLUMN IF NOT EXISTS lot_no VARCHAR(60);
        ALTER TABLE stock_balance ADD COLUMN IF NOT EXISTS serial_no VARCHAR(60);
        ALTER TABLE stock_balance ADD COLUMN IF NOT EXISTS expiry_date DATE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_ledger' AND column_name = 'batch_no') THEN
        ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS lot_no VARCHAR(60);
        ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS serial_no VARCHAR(60);
        ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS expiry_date DATE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grn_line' AND column_name = 'batch_no') THEN
        ALTER TABLE grn_line ADD COLUMN IF NOT EXISTS lot_no VARCHAR(60);
        ALTER TABLE grn_line ADD COLUMN IF NOT EXISTS serial_no VARCHAR(60);
        ALTER TABLE grn_line ADD COLUMN IF NOT EXISTS expiry_date DATE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'po_inward_line' AND column_name = 'batch_no') THEN
        ALTER TABLE po_inward_line ADD COLUMN IF NOT EXISTS lot_no VARCHAR(60);
        ALTER TABLE po_inward_line ADD COLUMN IF NOT EXISTS serial_no VARCHAR(60);
        ALTER TABLE po_inward_line ADD COLUMN IF NOT EXISTS expiry_date DATE;
    END IF;
END $$;
