-- ============================================================
-- V11: Customer-specific fields on party_master
-- Uses DO blocks to skip columns that already exist
-- (handles ddl-auto: update creating columns before Flyway runs)
-- ============================================================

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN display_name VARCHAR(200);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN customer_type VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN customer_category VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN customer_status VARCHAR(30) DEFAULT 'Active';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN customer_rating VARCHAR(10);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN customer_priority VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN onboarding_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN salesperson VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN customer_group VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Company details
DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN company_reg_no VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN cin VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN pan VARCHAR(30);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN website VARCHAR(200);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN industry VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN business_type VARCHAR(30);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN business_nature VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN established_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN number_of_employees INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN annual_turnover NUMERIC(14,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN remarks TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- GST & Tax
DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN gst_registration_status VARCHAR(30);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN gstin VARCHAR(30);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN gst_registration_type VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN gst_effective_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN gst_expiry_date DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN gst_state VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN taxpayer_type VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN e_invoice_applicable BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN e_way_bill_applicable BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tds_applicable BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tcs_applicable BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tax_exemption BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tax_exemption_number VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tax_exemption_from DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tax_exemption_to DATE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN pan_number VARCHAR(30);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN pan_holder_name VARCHAR(120);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN pan_status VARCHAR(30);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN default_tax_category VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN default_gst_rate NUMERIC(5,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tds_section VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tds_rate NUMERIC(5,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN tcs_rate NUMERIC(5,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN reverse_charge_applicable BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Payment & Commercial
DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN currency VARCHAR(10) DEFAULT 'INR';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN payment_terms2 VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN credit_limit2 NUMERIC(14,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN credit_days2 INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN payment_method VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN price_list VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN discount NUMERIC(5,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN sales_territory VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN incoterms VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN freight_terms VARCHAR(60);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN insurance_terms VARCHAR(200);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN delivery_terms2 VARCHAR(200);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN billing_cycle VARCHAR(30);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN credit_hold BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN credit_hold_reason VARCHAR(200);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN advance_required BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN advance_percentage NUMERIC(5,2);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- JSON columns for complex nested data
DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN contacts_json TEXT DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN addresses_json TEXT DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN delivery_addresses_json TEXT DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN bank_accounts_json TEXT DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE party_master ADD COLUMN documents_json TEXT DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes (use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_party_customer_status ON party_master(customer_status);
CREATE INDEX IF NOT EXISTS idx_party_customer_type ON party_master(customer_type);
CREATE INDEX IF NOT EXISTS idx_party_customer_rating ON party_master(customer_rating);
