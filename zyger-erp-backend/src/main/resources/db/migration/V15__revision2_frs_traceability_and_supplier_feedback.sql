-- V15: Revision 2 FRS Traceability, Item Controls & Supplier Feedback Loop

-- 1. Item Master Traceability & IQC Controls
ALTER TABLE item_master
  ADD COLUMN IF NOT EXISTS batch_heat_mandatory BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS serial_generation_rule VARCHAR(30) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS fg_serial_prefix VARCHAR(60);

-- 2. Party & Vendor Master Approved Vendor Status & Scorecard Metrics
ALTER TABLE party_master
  ADD COLUMN IF NOT EXISTS approved_vendor_status VARCHAR(30) DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS quality_acceptance_rate NUMERIC(5, 2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS otif_rate NUMERIC(5, 2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS overall_supplier_grade VARCHAR(5) DEFAULT 'A';

ALTER TABLE vendor_master
  ADD COLUMN IF NOT EXISTS approved_vendor_status VARCHAR(30) DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS quality_acceptance_rate NUMERIC(5, 2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS otif_rate NUMERIC(5, 2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS overall_supplier_grade VARCHAR(5) DEFAULT 'A';

-- 3. Subcontracting Return Inspection Flag
ALTER TABLE job_order
  ADD COLUMN IF NOT EXISTS sri_required BOOLEAN DEFAULT TRUE;

-- 4. Cross-Module Document Traceability Indexes
CREATE INDEX IF NOT EXISTS idx_grn_po_ge_batch_heat ON grn (source_document_no, party);
CREATE INDEX IF NOT EXISTS idx_qi_po_ge_batch_heat ON quality_inspection (purchase_order_number, po_inward_number, batch_number, heat_number);
