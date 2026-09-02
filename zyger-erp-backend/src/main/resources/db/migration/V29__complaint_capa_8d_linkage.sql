-- V29: FRS P2 corrections
--   §10.5  Complaint -> CAPA -> 8D FK linkage (source_complaint_id / source_capa_id / source_ncr_id)
--   §6.3   Outward Test Certificate typing (certificate_type default + sales_order_ref / dc_ref / invoice_ref)
--
-- Guards handle ddl-auto: update having already created tables/columns before Flyway runs.

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quality_capa') THEN
        ALTER TABLE quality_capa ADD COLUMN IF NOT EXISTS source_complaint_id BIGINT;
        ALTER TABLE quality_capa ADD COLUMN IF NOT EXISTS source_ncr_id BIGINT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quality_8d') THEN
        ALTER TABLE quality_8d ADD COLUMN IF NOT EXISTS source_complaint_id BIGINT;
        ALTER TABLE quality_8d ADD COLUMN IF NOT EXISTS source_capa_id BIGINT;
        ALTER TABLE quality_8d ADD COLUMN IF NOT EXISTS source_ncr_id BIGINT;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quality_test_certificate') THEN
        ALTER TABLE quality_test_certificate ADD COLUMN IF NOT EXISTS certificate_type VARCHAR(20) DEFAULT 'INTERNAL';
        ALTER TABLE quality_test_certificate ADD COLUMN IF NOT EXISTS sales_order_ref VARCHAR(30);
        ALTER TABLE quality_test_certificate ADD COLUMN IF NOT EXISTS dc_ref VARCHAR(30);
        ALTER TABLE quality_test_certificate ADD COLUMN IF NOT EXISTS invoice_ref VARCHAR(30);
    END IF;
END $$;
