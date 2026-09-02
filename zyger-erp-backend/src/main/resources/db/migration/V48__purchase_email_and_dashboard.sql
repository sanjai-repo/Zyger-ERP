-- ═══════════════════════════════════════════════════
-- V48: Purchase email dispatch + dashboard tracking
-- Adds email tracking columns for Supplier Enquiry (RFQ),
-- Purchase Order, and Job Order (subcontractor) sends.
-- ═══════════════════════════════════════════════════

-- 1. SUPPLIER ENQUIRY -> SUPPLIER: per-supplier email tracking
ALTER TABLE supplier_enquiry_supplier ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE supplier_enquiry_supplier ADD COLUMN IF NOT EXISTS email_status  VARCHAR(30);
ALTER TABLE supplier_enquiry_supplier ADD COLUMN IF NOT EXISTS email_error   VARCHAR(500);

-- 2. PURCHASE ORDER: PO email tracking
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS email_status  VARCHAR(30);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS email_error   VARCHAR(500);

-- 3. JOB ORDER: subcontractor email address + send tracking
ALTER TABLE job_order ADD COLUMN IF NOT EXISTS email         VARCHAR(120);
ALTER TABLE job_order ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE job_order ADD COLUMN IF NOT EXISTS email_status  VARCHAR(30);
ALTER TABLE job_order ADD COLUMN IF NOT EXISTS email_error   VARCHAR(500);
