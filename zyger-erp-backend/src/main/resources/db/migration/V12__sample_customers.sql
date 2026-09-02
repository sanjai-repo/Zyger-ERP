-- V12: Sample customer data for testing

INSERT INTO party_master (kind, code, name, display_name, customer_type, customer_category,
    customer_status, customer_rating, customer_priority, gst_registration_status, gstin,
    gst_registration_type, gst_state, currency, payment_terms2, industry, business_nature,
    website, contact_person, phone, email, address, created_by, created_at)
VALUES
('CUSTOMER', 'CUS-2026-0001', 'Tata Motors Ltd', 'Tata Motors', 'OEM', 'Domestic',
 'Active', 'A', 'High', 'Registered', '27AABCT1234F1Z5',
 'Regular', 'Maharashtra', 'INR', 'Net 45', 'Automotive', 'Manufacturer',
 'https://www.tatamotors.com', 'Rajesh Kumar', '+91-22-66657219', 'rajesh.kumar@tatamotors.com',
 'Mumbai, Maharashtra', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0002', 'Mahindra & Mahindra Ltd', 'Mahindra', 'OEM', 'Domestic',
 'Active', 'A', 'High', 'Registered', '27AABCM5678G1Z6',
 'Regular', 'Maharashtra', 'INR', 'Net 30', 'Automotive', 'Manufacturer',
 'https://www.mahindra.com', 'Priya Sharma', '+91-22-40295050', 'priya.sharma@mahindra.com',
 'Mumbai, Maharashtra', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0003', 'Ashok Leyland Ltd', 'Ashok Leyland', 'Tier-1', 'Domestic',
 'Active', 'B', 'Medium', 'Registered', '33AABCA9012H1Z7',
 'Regular', 'Tamil Nadu', 'INR', 'Net 30', 'Automotive', 'Manufacturer',
 'https://www.ashokleyland.com', 'Vikram Singh', '+91-44-66625555', 'vikram.singh@ashokleyland.com',
 'Chennai, Tamil Nadu', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0004', 'Bosch Ltd India', 'Bosch India', 'Tier-1', 'Export',
 'Active', 'A', 'High', 'Registered', '29AABCB3456I1Z8',
 'Regular', 'Karnataka', 'INR', 'Net 45', 'Engineering', 'Manufacturer',
 'https://www.bosch.co.in', 'Anita Desai', '+91-80-67543000', 'anita.desai@bosch.in',
 'Bangalore, Karnataka', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0005', 'Hero MotoCorp Ltd', 'Hero MotoCorp', 'OEM', 'Domestic',
 'Active', 'A', 'High', 'Registered', '07AABCH7890J1Z9',
 'Regular', 'Delhi', 'INR', 'Net 30', 'Automotive', 'Manufacturer',
 'https://www.heromotocorp.com', 'Sanjay Mehta', '+91-11-71900000', 'sanjay.mehta@heromotocorp.com',
 'New Delhi', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0006', 'Sundaram Fasteners Ltd', 'Sundaram Fasteners', 'Tier-2', 'Domestic',
 'Active', 'B', 'Medium', 'Registered', '33AABCS2345K1Z0',
 'Regular', 'Tamil Nadu', 'INR', 'Net 30', 'Automotive', 'Manufacturer',
 'https://www.sundaramfasteners.com', 'Kumar Rajan', '+91-4182-247100', 'kumar.rajan@sundaram.in',
 'Hosur, Tamil Nadu', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0007', 'Tata Steel Ltd', 'Tata Steel', 'Trading', 'Government',
 'Active', 'A', 'High', 'Registered', '20AABCT3456L1Z1',
 'Regular', 'Jharkhand', 'INR', 'Net 60', 'Engineering', 'Manufacturer',
 'https://www.tatasteel.com', 'Deepak Agarwal', '+91-657-6653010', 'deepak.agarwal@tatasteel.com',
 'Jamshedpur, Jharkhand', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0008', 'L&T Defence Technology', 'L&T Defence', 'Vendor-Customer', 'Government',
 'Active', 'B', 'Medium', 'Registered', '27AABCL6789M1Z2',
 'Regular', 'Maharashtra', 'INR', 'Net 45', 'Defence', 'Manufacturer',
 'https://www.larsentoubro.com', 'Arun Nair', '+91-22-67525656', 'arun.nair@larsentoubro.com',
 'Mumbai, Maharashtra', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0009', 'Bharat Forge Ltd', 'Bharat Forge', 'Tier-1', 'Export',
 'Active', 'A', 'High', 'Registered', '27AABCB0123N1Z3',
 'Regular', 'Maharashtra', 'INR', 'Net 30', 'Automotive', 'Manufacturer',
 'https://www.bharatforge.com', 'Nitin Kulkarni', '+91-20-67031000', 'nitin.kulkarni@bharatforge.com',
 'Pune, Maharashtra', 'system', NOW()),

('CUSTOMER', 'CUS-2026-0010', 'TVS Motor Company', 'TVS Motor', 'OEM', 'Domestic',
 'Inactive', 'C', 'Low', 'Registered', '33AABCT4567P1Z4',
 'Regular', 'Tamil Nadu', 'INR', 'Net 15', 'Automotive', 'Manufacturer',
 'https://www.tvsmotor.com', 'Suresh Babu', '+91-422-2433551', 'suresh.babu@tvsmotor.com',
 'Chennai, Tamil Nadu', 'system', NOW());
