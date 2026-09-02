-- Migration to set resource code prefix to RES in numbering_config
INSERT INTO numbering_config (doc_type, prefix, zero_pad, reset_per_year, separator, active)
VALUES ('resource', 'RES', 4, true, '-', true)
ON CONFLICT (doc_type) DO UPDATE SET prefix = 'RES';

-- Update existing resource codes from RESOURCE- to RES- in resource_master table
UPDATE resource_master SET resource_code = REPLACE(resource_code, 'RESOURCE-', 'RES-') WHERE resource_code LIKE 'RESOURCE-%';
