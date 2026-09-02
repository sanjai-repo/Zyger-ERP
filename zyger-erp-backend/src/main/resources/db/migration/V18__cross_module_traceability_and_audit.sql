-- Flyway Migration V18: Cross-Module Traceability View & Audit Enhancements

-- View for forward and reverse material traceability chain (GBL-09)
-- Customer Order -> Sales Order -> Work Order -> Job Card -> Production -> Quality -> Heat/Batch -> Supplier GRN
CREATE OR REPLACE VIEW vw_material_traceability_chain AS
SELECT 
    so.id AS sales_order_id,
    so.doc_no AS sales_order_no,
    so.party_name AS customer_name,
    wo.id AS work_order_id,
    wo.doc_no AS work_order_no,
    jc.id AS job_card_id,
    jc.doc_no AS job_card_no,
    pe.id AS production_entry_id,
    pe.doc_no AS production_entry_no,
    pe.quality_status AS production_quality_status,
    qi.id AS quality_inspection_id,
    qi.inspection_number AS quality_inspection_no,
    qi.inspection_status AS inspection_status,
    qi.batch_number AS batch_number,
    qi.lot_number AS lot_number,
    qi.heat_number AS heat_number,
    grn.id AS goods_receipt_id,
    grn.doc_no AS grn_no,
    grn.party_name AS supplier_name,
    po.doc_no AS purchase_order_no
FROM sales_order so
LEFT JOIN work_order wo ON wo.source_number = so.doc_no OR wo.doc_no = so.reference_number
LEFT JOIN job_cards jc ON jc.work_order_id = wo.id
LEFT JOIN production_entries pe ON pe.job_card_id = jc.id
LEFT JOIN quality_inspection qi ON qi.source_doc_no = pe.doc_no OR qi.batch_number = pe.batch_no OR qi.heat_number = pe.heat_number
LEFT JOIN goods_receipt grn ON grn.doc_no = qi.source_doc_no OR grn.batch_number = qi.batch_number
LEFT JOIN purchase_order po ON po.doc_no = grn.purchase_order_number;

-- Indexing for rapid cross-module batch/heat/serial queries
CREATE INDEX IF NOT EXISTS idx_qi_batch_heat ON quality_inspection(batch_number, heat_number);
CREATE INDEX IF NOT EXISTS idx_pe_batch ON production_entries(batch_no);
