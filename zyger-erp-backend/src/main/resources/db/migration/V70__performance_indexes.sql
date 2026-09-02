-- V70: Performance indexes for hot query patterns
-- These indexes cover the most common query patterns in DocumentFacade.paginate() and list()

-- Sales Order indexes
CREATE INDEX IF NOT EXISTS idx_sales_order_status_date ON sales_order (status, doc_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_order_customer ON sales_order (customer_code, status);
CREATE INDEX IF NOT EXISTS idx_sales_order_delivery ON sales_order (delivery_date) WHERE status IN ('APPROVED', 'PARTIALLY_DISPATCHED');

-- Purchase Order indexes
CREATE INDEX IF NOT EXISTS idx_purchase_order_status_date ON purchase_order (status, doc_date DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier ON purchase_order (supplier_code, status);

-- Quality Inspection indexes
CREATE INDEX IF NOT EXISTS idx_qi_item_batch ON quality_inspection (item_code, batch_number, heat_number);
CREATE INDEX IF NOT EXISTS idx_qi_status_type ON quality_inspection (inspection_status, inspection_type);
CREATE INDEX IF NOT EXISTS idx_qi_source ON quality_inspection (source_type, source_number);

-- Stock Ledger indexes
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item_loc ON stock_ledger (item_code, location);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_batch ON stock_ledger (item_code, batch_no, heat_no);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_date ON stock_ledger (transaction_date DESC);

-- Stock Balance indexes
CREATE INDEX IF NOT EXISTS idx_stock_balance_item ON stock_balance (item_code, location);
CREATE INDEX IF NOT EXISTS idx_stock_balance_status ON stock_balance (stock_status, item_code);

-- Work Order indexes
CREATE INDEX IF NOT EXISTS idx_work_order_status ON work_order (status, wo_type);
CREATE INDEX IF NOT EXISTS idx_work_order_item ON work_order (item_code, status);

-- Job Order indexes
CREATE INDEX IF NOT EXISTS idx_job_order_status ON job_order (status, doc_date DESC);

-- Maintenance indexes
CREATE INDEX IF NOT EXISTS idx_breakdown_machine ON breakdown_intimation (machine_id, status);
CREATE INDEX IF NOT EXISTS idx_pm_schedule_next ON pm_schedule (next_due_date) WHERE status = 'PENDING';

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_status ON notification (user_id, is_read, created_at DESC);

-- Audit Log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id, created_at DESC);

-- Generic document table index for soft-delete queries
-- Most document tables use (deleted, doc_date, status) pattern
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'deleted' AND table_schema = 'public'
        AND table_name IN (
            'sales_order', 'purchase_order', 'work_order', 'job_order',
            'quality_inspection', 'quality_ncr', 'general_inward', 'general_issue',
            'stock_allotment', 'stock_release', 'dispatch_plan',
            'production_entry', 'maintenance_cost_transaction'
        )
    LOOP
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS idx_%s_active_date ON %s (doc_date DESC) WHERE deleted IS NULL OR deleted = false',
            tbl, tbl
        );
    END LOOP;
END $$;
