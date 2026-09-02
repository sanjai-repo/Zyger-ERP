-- Migration to update item_type for wheel and customer-supplied items to SEMI_FG for route sheet manufacturing operations
UPDATE item_master SET item_type = 'SEMI_FG' WHERE LOWER(name) LIKE '%wheel%' OR LOWER(description) LIKE '%wheel%' OR LOWER(code) LIKE '%wheel%';
UPDATE route_sheet SET item_type = 'SEMI_FG' WHERE LOWER(item_code) LIKE '%wheel%' OR item_type = 'CUSTOMER_SUPPLIED';
