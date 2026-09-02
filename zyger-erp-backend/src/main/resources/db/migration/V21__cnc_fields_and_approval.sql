-- V21: CNC identity fields on order line items + party approval status
-- PurchaseOrderItem: MTC requirement and heat-number traceability flags
ALTER TABLE purchase_order_item ADD COLUMN IF NOT EXISTS material_certificate_required BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_order_item ADD COLUMN IF NOT EXISTS heat_number_required BOOLEAN DEFAULT FALSE;

-- SalesOrderItem: surface finish, heat treatment and certificate requirements
ALTER TABLE sales_order_item ADD COLUMN IF NOT EXISTS surface_finish_requirement VARCHAR(200);
ALTER TABLE sales_order_item ADD COLUMN IF NOT EXISTS heat_treatment_required BOOLEAN DEFAULT FALSE;
ALTER TABLE sales_order_item ADD COLUMN IF NOT EXISTS certificate_required VARCHAR(50);

-- Party: approval workflow status (DRAFT, PENDING_APPROVAL, APPROVED, BLOCKED)
ALTER TABLE party_master ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'APPROVED';
