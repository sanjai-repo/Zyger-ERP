CREATE TABLE IF NOT EXISTS numbering_config (
    id BIGSERIAL PRIMARY KEY,
    doc_type VARCHAR(60) NOT NULL UNIQUE,
    prefix VARCHAR(20) NOT NULL,
    zero_pad INTEGER NOT NULL DEFAULT 6,
    reset_per_year BOOLEAN NOT NULL DEFAULT TRUE,
    separator VARCHAR(10) DEFAULT '-',
    active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed with existing hard-coded prefixes from DocTypes.java
INSERT INTO numbering_config (doc_type, prefix) VALUES
('purchase-request', 'PR'),
('supplier-enquiry', 'SE'),
('supplier-quotation', 'SQ'),
('purchase-order', 'PO'),
('job-order', 'JO'),
('purchase-target', 'PT'),
('sales-order', 'SO'),
('proforma-invoice', 'PI'),
('sales-dc', 'DC'),
('sales-invoice', 'SI'),
('production-bom', 'BOM'),
('route-sheet', 'RT'),
('work-order', 'WO'),
('quality-inspection', 'QI'),
('quality-ncr', 'NCR'),
('quality-concession', 'CON'),
('quality-complaint', 'CMP'),
('quality-capa', 'CAPA'),
('quality-eight-d', '8D'),
('calibration', 'CAL'),
('breakdown', 'BRK'),
('pm-schedule', 'PM')
ON CONFLICT (doc_type) DO NOTHING;
