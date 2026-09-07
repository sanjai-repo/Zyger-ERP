export interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  options?: string[];
  required?: boolean;
  span2?: boolean;
  readOnly?: boolean;
}

export interface LineFieldDef {
  colNo: number;
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'lookup';
  options?: string[];
  readOnly?: boolean;
  required?: boolean;
  width?: string;
}

export interface ColumnDef {
  label: string;
  field: string;
  numeric?: boolean;
  badge?: boolean;
}

export interface DocScreenConfig {
  docType: string;
  title: string;
  subtitle: string;
  columns: ColumnDef[];
  statusField: string;
  statusOptions: string[];
  disableApprovalWorkflow?: boolean;
  hideTopSave?: boolean;
  typeFilter?: { field: string; label: string; options: string[] };
  fields: FieldDef[];
  lines?: { title: string; fields: LineFieldDef[] };
}

const GENERIC_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED'];

// ─── 1. Purchase Request (PR) ────────────────────────────────────────
// Entity: PurchaseRequest → BaseDoc + requestingDepartment, requestBy,
//   requiredDate, priority, requestType, source, referenceType, referenceNumber
// Lines: PurchaseRequestLine → BaseLine + itemName, itemType, specification,
//   drawingNumber, drawingRevision, materialGrade, size, requiredQty, uom, requiredDate,
//   storeWarehouse, jobOrderReference, productionReference
export const PURCHASE_REQUEST_CONFIG: DocScreenConfig = {
  docType: 'purchase-request',
  title: 'Purchase Request',
  subtitle: 'Internal departmental request for materials, consumables, tools or services',
  disableApprovalWorkflow: true,
  columns: [
    { label: 'PR Number', field: 'docNo' },
    { label: 'PR Date', field: 'date' },
    { label: 'Department', field: 'requestingDepartment' },
    { label: 'Requested By', field: 'requestBy' },
    { label: 'Required Date', field: 'requiredDate' },
    { label: 'Priority', field: 'priority' },
    { label: 'Status', field: 'status', badge: true },
  ],
  statusField: 'status',
  statusOptions: [...GENERIC_STATUSES, 'SUBMITTED'],
  fields: [
    { key: 'docNo', label: 'PR Number (Auto)', readOnly: true },
    { key: 'date', label: 'Request Date *', type: 'date', required: true },
    { key: 'requestingDepartment', label: 'Department *', type: 'select', options: ['Production', 'Maintenance', 'Quality', 'Store', 'Purchase', 'Administration'], required: true },
    { key: 'requestBy', label: 'Requested By *', required: true },
    { key: 'requiredDate', label: 'Required Date', type: 'date' },
    { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'] },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'Purchase Request Items',
    fields: [
      { colNo: 1, key: 'lineNo', label: 'Line #', readOnly: true, width: '55px' },
      { colNo: 2, key: 'itemCode', label: 'Item Code *', type: 'lookup', required: true, width: '180px' },
      { colNo: 3, key: 'itemName', label: 'Item Name *', required: true, width: '170px' },
      { colNo: 4, key: 'itemType', label: 'Item Type', type: 'select', options: ['Raw Material', 'Consumable', 'Tooling', 'Spare', 'Service'], width: '115px' },
      { colNo: 5, key: 'specification', label: 'Specification', width: '110px' },
      { colNo: 6, key: 'materialGrade', label: 'Material Grade', width: '100px' },
      { colNo: 7, key: 'size', label: 'Size', width: '80px' },
      { colNo: 8, key: 'requiredQty', label: 'Quantity *', type: 'number', required: true, width: '85px' },
      { colNo: 9, key: 'uom', label: 'UOM', width: '95px' },
      { colNo: 10, key: 'requiredDate', label: 'Required Date', type: 'date', width: '125px' },
      { colNo: 11, key: 'remarks', label: 'Remarks', width: '120px' },
    ],
  },
};

// ─── 2. Supplier Enquiry (SE) ────────────────────────────────────────
// Entity: SupplierEnquiry → BaseDoc + purchaseRequestNumber, buyer,
//   requiredDate, quotationValidityDate, currency, paymentTerms, deliveryTerms
// Lines: SupplierEnquiryItem → BaseLine + itemName, specification,
//   drawingNumber, drawingRevision, requiredQty, uom, requiredDeliveryDate
export const SUPPLIER_ENQUIRY_CONFIG: DocScreenConfig = {
  docType: 'supplier-enquiry',
  title: 'Supplier Enquiry',
  subtitle: 'Send RFQ to multiple suppliers and compare responses',
  disableApprovalWorkflow: true,
  columns: [
    { label: 'Enquiry No', field: 'docNo' },
    { label: 'PR Reference', field: 'purchaseRequestNumber' },
    { label: 'Supplier', field: 'supplier' },
    { label: 'Enquiry Date', field: 'date' },
    { label: 'Enquirer Name', field: 'buyer' },
    { label: 'Required Date', field: 'requiredDate' },
    { label: 'Status', field: 'status', badge: true },
  ],
  statusField: 'status',
  statusOptions: [...GENERIC_STATUSES, 'SENT', 'QUOTED', 'SUBMITTED'],
  fields: [
    { key: 'docNo', label: 'Enquiry Number (Auto)', readOnly: true },
    { key: 'purchaseRequestNumber', label: 'PR Reference' },
    { key: 'date', label: 'Enquiry Date *', type: 'date', required: true },
    { key: 'supplier', label: 'Supplier Name *', required: true },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'buyer', label: 'Enquirer Name *', required: true },
    { key: 'requiredDate', label: 'Required Date', type: 'date' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'Enquiry Items',
    fields: [
      { colNo: 1, key: 'lineNo', label: 'Line #', readOnly: true },
      { colNo: 2, key: 'itemCode', label: 'Item Code / Name *', type: 'lookup', required: true },
      { colNo: 3, key: 'itemName', label: 'Item Name *', required: true },
      { colNo: 4, key: 'description', label: 'Description' },
      { colNo: 5, key: 'specification', label: 'Specification' },
      { colNo: 6, key: 'requiredQty', label: 'Quantity *', type: 'number', required: true },
      { colNo: 7, key: 'uom', label: 'UOM' },
      { colNo: 8, key: 'requiredDeliveryDate', label: 'Required Delivery Date', type: 'date' },
      { colNo: 9, key: 'remarks', label: 'Remarks' },
    ],
  },
};

// ─── 3. Supplier Quotation (SQ) ─────────────────────────────────────
// Entity: SupplierQuotation → BaseDoc + supplier, enquiryNumber, validUntil,
//   currency, paymentTerms, deliveryTerms, freight, insurance, taxes, otherCharges
// Lines: SupplierQuotationItem → BaseLine + itemName, description, requiredQty,
//   uom, unitPrice, discount, tax, netPrice, deliveryLeadTime, minimumOrderQty,
//   manufacturerBrand, specification
export const SUPPLIER_QUOTATION_CONFIG: DocScreenConfig = {
  docType: 'supplier-quotation',
  title: 'Supplier Quotation',
  subtitle: 'Record supplier quotations for comparison and PO selection',
  disableApprovalWorkflow: true,
  columns: [
    { label: 'Quotation No', field: 'docNo' },
    { label: 'Enquiry Ref', field: 'enquiryNumber' },
    { label: 'Supplier', field: 'supplier' },
    { label: 'Quotation Date', field: 'date' },
    { label: 'Valid Until', field: 'validUntil' },
    { label: 'Status', field: 'status', badge: true },
  ],
  statusField: 'status',
  statusOptions: [...GENERIC_STATUSES, 'SELECTED', 'SUBMITTED'],
  fields: [
    { key: 'docNo', label: 'Quotation Number (Auto)', readOnly: true },
    { key: 'enquiryNumber', label: 'Enquiry Reference (Select Option)', required: true },
    { key: 'date', label: 'Quotation Date', type: 'date', required: true },
    { key: 'supplier', label: 'Supplier Name', required: true },
    { key: 'validUntil', label: 'Valid Until Date', type: 'date' },
    { key: 'paymentTerms', label: 'Payment Terms' },
    { key: 'taxes', label: 'Taxes (₹)', type: 'number' },
    { key: 'otherCharges', label: 'Other Charges (₹)', type: 'number' },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'Quotation Items',
    fields: [
      { colNo: 1, key: 'lineNo', label: 'Line #', readOnly: true },
      { colNo: 2, key: 'itemCode', label: 'Item Code (Lookup)', type: 'lookup', required: true },
      { colNo: 3, key: 'itemName', label: 'Item Name' },
      { colNo: 4, key: 'description', label: 'Description' },
      { colNo: 5, key: 'specification', label: 'Specification' },
      { colNo: 6, key: 'requiredQty', label: 'Quoted Qty *', type: 'number', required: true },
      { colNo: 7, key: 'uom', label: 'UOM' },
      { colNo: 8, key: 'unitPrice', label: 'Unit Price (₹) *', type: 'number', required: true },
      { colNo: 9, key: 'discount', label: 'Discount (%)', type: 'number' },
      { colNo: 10, key: 'tax', label: 'Tax (%)', type: 'number' },
      { colNo: 11, key: 'taxAmount', label: 'Tax Amount (₹)', type: 'number', readOnly: true },
      { colNo: 12, key: 'netPrice', label: 'Net Amount (₹)', type: 'number', readOnly: true },
      { colNo: 13, key: 'deliveryLeadTime', label: 'Lead Time (Days)', type: 'number' },
      { colNo: 14, key: 'minimumOrderQty', label: 'Min Order Qty', type: 'number' },
      { colNo: 15, key: 'manufacturerBrand', label: 'Manufacturer / Brand' },
      { colNo: 16, key: 'remarks', label: 'Remarks' },
    ],
  },
};

// ─── 4. Purchase Order (PO) ─────────────────────────────────────────
// Entity: PurchaseOrder → BaseDoc + supplier, supplierCode, buyer, department,
//   purchaseRequestNumber, quotationNumber, currency, paymentTerms, deliveryTerms,
//   deliveryLocation, expectedDeliveryDate, freightTerms, taxDetails,
//   billingAddress, shippingAddress
// Lines: PurchaseOrderItem → BaseLine + itemName, specification, drawingNumber,
//   drawingRevision, materialGrade, size, orderQty, uom, unitPrice, discount,
//   tax, netAmount, requiredDate, warehouse, scheduleReference, jobOrderReference
export const PURCHASE_ORDER_CONFIG: DocScreenConfig = {
  docType: 'purchase-order',
  title: 'Purchase Order',
  subtitle: 'Official commercial document issued to supplier with item, quantity, price and delivery terms',
  disableApprovalWorkflow: true,
  hideTopSave: true,
  columns: [
    { label: 'PO Number', field: 'docNo' },
    { label: 'Quotation Ref', field: 'quotationNumber' },
    { label: 'PO Date', field: 'date' },
    { label: 'Supplier', field: 'supplier' },
    { label: 'Buyer', field: 'buyer' },
    { label: 'Status', field: 'status', badge: true },
  ],
  statusField: 'status',
  statusOptions: [...GENERIC_STATUSES, 'RELEASED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'ON_HOLD', 'SUBMITTED'],
  fields: [
    { key: 'docNo', label: 'PO Number (Auto)', readOnly: true },
    { key: 'quotationNumber', label: 'Reference Quotation (Select Option) *', required: true },
    { key: 'date', label: 'PO Date *', type: 'date', required: true },
    { key: 'supplier', label: 'Supplier Name *', required: true },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'buyer', label: 'Buyer *', required: true },
    { key: 'billingAddress', label: 'Billing Address', type: 'textarea' },
    { key: 'shippingAddress', label: 'Shipping Address', type: 'textarea' },
    { key: 'remarks', label: 'Remarks', type: 'textarea' },
  ],
  lines: {
    title: 'Purchase Order Line Items',
    fields: [
      { colNo: 1, key: 'lineNo', label: 'Line #', readOnly: true },
      { colNo: 2, key: 'itemCode', label: 'Item Code (Lookup)', type: 'lookup', required: true },
      { colNo: 3, key: 'itemName', label: 'Item Name' },
      { colNo: 4, key: 'specification', label: 'Specification' },
      { colNo: 5, key: 'materialGrade', label: 'Material Grade' },
      { colNo: 6, key: 'size', label: 'Size' },
      { colNo: 7, key: 'orderQty', label: 'Order Qty *', type: 'number', required: true },
      { colNo: 8, key: 'uom', label: 'UOM' },
      { colNo: 9, key: 'unitPrice', label: 'Unit Price (₹) *', type: 'number', required: true },
      { colNo: 10, key: 'discount', label: 'Discount (%)', type: 'number' },
      { colNo: 11, key: 'tax', label: 'Tax (%)', type: 'number' },
      { colNo: 12, key: 'taxAmount', label: 'Tax Amount (₹)', type: 'number', readOnly: true },
      { colNo: 13, key: 'netAmount', label: 'Net Amount (₹)', type: 'number', readOnly: true },
      { colNo: 14, key: 'requiredDate', label: 'Required Date *', type: 'date', required: true },
      { colNo: 15, key: 'remarks', label: 'Remarks' },
    ],
  },
};

// ─── 5. Job Order (JO / Subcontract Purchase) ───────────────────────
// Entity: JobOrder → BaseDoc + supplierJobWorker, jobWorkType, process,
//   productionReference, jobOrderReference, requiredDate, expectedReturnDate, paymentTerms
// Lines: JobOrderItem → BaseLine + itemName, description, orderQty, uom,
//   batchLotNumber, heatNumber, serialNumber, drawingNumber, drawingRevision,
//   materialIssueReference, processSpecification, qualityRequirement, certificateRequirement
export const JOB_ORDER_CONFIG: DocScreenConfig = {
  docType: 'job-order',
  title: 'Job Order',
  subtitle: 'Subcontract processing order — send material to external supplier for heat treatment, grinding, plating etc.',
  columns: [
    { label: 'JO Number', field: 'docNo' },
    { label: 'JO Date', field: 'date' },
    { label: 'Subcontractor', field: 'supplierJobWorker' },
    { label: 'Process', field: 'process' },
    { label: 'Job Type', field: 'jobWorkType' },
    { label: 'Return Date', field: 'expectedReturnDate' },
    { label: 'Status', field: 'status', badge: true },
  ],
  statusField: 'status',
  statusOptions: [...GENERIC_STATUSES, 'MATERIAL_ISSUED', 'IN_PROCESS', 'PARTIALLY_RECEIVED', 'SUBMITTED'],
  fields: [
    { key: 'docNo', label: 'Job Order Number (Auto)', readOnly: true },
    { key: 'date', label: 'JO Date *', type: 'date', required: true },
    { key: 'supplierJobWorker', label: 'Subcontractor / Supplier *', required: true },
    { key: 'process', label: 'Process *', type: 'select', options: ['Heat Treatment', 'Plating', 'Grinding', 'Anodizing', 'Powder Coating', 'Machining', 'Laser Cutting', 'Welding', 'Surface Treatment', 'Hardening'], required: true },
    { key: 'jobWorkType', label: 'Job Type *', type: 'select', options: ['Subcontract', 'Job Work'], required: true },
    { key: 'productionReference', label: 'Production Order Reference' },
    { key: 'jobOrderReference', label: 'Work Order Reference' },
    { key: 'requiredDate', label: 'Required Date', type: 'date' },
    { key: 'expectedReturnDate', label: 'Expected Return Date *', type: 'date', required: true },
    { key: 'paymentTerms', label: 'Payment Terms' },
    { key: 'status', label: 'Status', readOnly: true },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  lines: {
    title: 'Job Order Line Items',
    fields: [
      { colNo: 1, key: 'lineNo', label: 'Line #', readOnly: true },
      { colNo: 2, key: 'itemCode', label: 'Item Code (Lookup)', type: 'lookup', required: true },
      { colNo: 3, key: 'itemName', label: 'Item Name' },
      { colNo: 4, key: 'description', label: 'Description' },
      { colNo: 5, key: 'orderQty', label: 'Qty to Send *', type: 'number', required: true },
      { colNo: 6, key: 'uom', label: 'UOM' },
      { colNo: 7, key: 'batchLotNumber', label: 'Batch / Lot #' },
      { colNo: 8, key: 'heatNumber', label: 'Heat #' },
      { colNo: 9, key: 'serialNumber', label: 'Serial #' },
      { colNo: 10, key: 'drawingNumber', label: 'Drawing No' },
      { colNo: 11, key: 'drawingRevision', label: 'Drawing Rev' },
      { colNo: 12, key: 'processSpecification', label: 'Process Spec' },
      { colNo: 13, key: 'qualityRequirement', label: 'Quality Req' },
      { colNo: 14, key: 'certificateRequirement', label: 'Certificate Req' },
      { colNo: 15, key: 'remarks', label: 'Remarks' },
    ],
  },
};

// ─── 6. Purchase Target ─────────────────────────────────────────────
// Entity: PurchaseTarget → BaseDoc + period, department, employeeBuyer,
//   targetType, startDate, endDate, targetValue, achievement, variance
// NOTE: Entity has NO lines — getLines() returns empty list
export const PURCHASE_TARGET_CONFIG: DocScreenConfig = {
  docType: 'purchase-target',
  title: 'Purchase Target',
  subtitle: 'Define and monitor procurement performance targets for the Purchase department',
  columns: [
    { label: 'Target Number', field: 'docNo' },
    { label: 'Period', field: 'period' },
    { label: 'Start Date', field: 'startDate' },
    { label: 'End Date', field: 'endDate' },
    { label: 'Buyer', field: 'employeeBuyer' },
    { label: 'Target Type', field: 'targetType' },
    { label: 'Target Value', field: 'targetValue', numeric: true },
    { label: 'Status', field: 'status', badge: true },
  ],
  statusField: 'status',
  statusOptions: ['DRAFT', 'ACTIVE', 'COMPLETED'],
  fields: [
    { key: 'docNo', label: 'Target Number (Auto)', readOnly: true },
    { key: 'date', label: 'Document Date *', type: 'date', required: true },
    { key: 'period', label: 'Target Period *', type: 'select', options: ['Monthly', 'Quarterly', 'Yearly'], required: true },
    { key: 'startDate', label: 'Start Date *', type: 'date', required: true },
    { key: 'endDate', label: 'End Date *', type: 'date', required: true },
    { key: 'employeeBuyer', label: 'Buyer / Employee *', required: true },
    { key: 'department', label: 'Department', type: 'select', options: ['Purchase', 'Production', 'Store', 'Maintenance'] },
    { key: 'targetType', label: 'Target Type *', type: 'select', options: ['Value', 'Savings', 'Delivery', 'Quality', 'Mixed'], required: true },
    { key: 'targetValue', label: 'Target Value (₹) *', type: 'number', required: true },
    { key: 'achievement', label: 'Achievement (₹)', type: 'number' },
    { key: 'variance', label: 'Variance (₹)', type: 'number', readOnly: true },
    { key: 'status', label: 'Status', readOnly: true },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
  // No lines — entity has no line items
};

// ─── 7. Purchase Price List ─────────────────────────────────────────
// Entity: PurchasePriceList → BaseDoc + supplier, itemCode, materialGrade,
//   size, uom, unitPrice, currency, minimumQty, effectiveFrom, effectiveTo,
//   tax, approvalStatus, revisionNumber
export const PURCHASE_PRICE_LIST_CONFIG: DocScreenConfig = {
  docType: 'purchase-price-list',
  title: 'Purchase Price List',
  subtitle: 'Maintain approved purchase prices for materials from suppliers',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Supplier', field: 'supplier' },
    { label: 'Item', field: 'itemCode' },
    { label: 'Price', field: 'unitPrice', numeric: true },
    { label: 'Effective From', field: 'effectiveFrom' },
    { label: 'Effective To', field: 'effectiveTo' },
    { label: 'Status', field: 'approvalStatus', badge: true },
  ],
  statusField: 'approvalStatus',
  statusOptions: ['DRAFT', 'APPROVED', 'EXPIRED', 'CANCELLED'],
  fields: [
    { key: 'docNo', label: 'Doc Number (Auto)', readOnly: true },
    { key: 'date', label: 'Date *', type: 'date', required: true },
    { key: 'supplier', label: 'Supplier *', required: true },
    { key: 'itemCode', label: 'Item Code *', required: true },
    { key: 'materialGrade', label: 'Material Grade' },
    { key: 'size', label: 'Size' },
    { key: 'uom', label: 'UOM' },
    { key: 'unitPrice', label: 'Unit Price (₹) *', type: 'number', required: true },
    { key: 'currency', label: 'Currency', type: 'select', options: ['INR', 'USD', 'EUR'] },
    { key: 'minimumQty', label: 'Minimum Order Qty', type: 'number' },
    { key: 'effectiveFrom', label: 'Effective From *', type: 'date', required: true },
    { key: 'effectiveTo', label: 'Effective To', type: 'date' },
    { key: 'tax', label: 'Tax %', type: 'number' },
    { key: 'revisionNumber', label: 'Revision #', type: 'number', readOnly: true },
    { key: 'approvalStatus', label: 'Approval Status', readOnly: true },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
};

// ─── 8. Job Work Price List ─────────────────────────────────────────
// Entity: JobWorkPriceList → BaseDoc + supplier, process, uom, rate,
//   rateBasis, effectiveFrom, effectiveTo, currency, approvalStatus, revisionNumber
export const JOB_WORK_PRICE_LIST_CONFIG: DocScreenConfig = {
  docType: 'job-work-price-list',
  title: 'Job Work Price List',
  subtitle: 'Maintain approved subcontract processing rates by supplier and process',
  columns: [
    { label: 'Doc No', field: 'docNo' },
    { label: 'Date', field: 'date' },
    { label: 'Supplier', field: 'supplier' },
    { label: 'Process', field: 'process' },
    { label: 'Rate', field: 'rate', numeric: true },
    { label: 'Basis', field: 'rateBasis' },
    { label: 'Effective From', field: 'effectiveFrom' },
    { label: 'Status', field: 'approvalStatus', badge: true },
  ],
  statusField: 'approvalStatus',
  statusOptions: ['DRAFT', 'APPROVED', 'EXPIRED', 'CANCELLED'],
  fields: [
    { key: 'docNo', label: 'Doc Number (Auto)', readOnly: true },
    { key: 'date', label: 'Date *', type: 'date', required: true },
    { key: 'supplier', label: 'Supplier *', required: true },
    { key: 'process', label: 'Process *', type: 'select', options: ['Heat Treatment', 'Plating', 'Grinding', 'Anodizing', 'Powder Coating', 'Machining', 'Laser Cutting', 'Welding', 'Surface Treatment', 'Hardening'], required: true },
    { key: 'uom', label: 'UOM' },
    { key: 'rate', label: 'Rate (₹) *', type: 'number', required: true },
    { key: 'rateBasis', label: 'Rate Basis', type: 'select', options: ['PER_PIECE', 'PER_KG', 'PER_LOT', 'PER_HOUR', 'PER_OPERATION', 'FIXED_CHARGE'] },
    { key: 'effectiveFrom', label: 'Effective From *', type: 'date', required: true },
    { key: 'effectiveTo', label: 'Effective To', type: 'date' },
    { key: 'currency', label: 'Currency', type: 'select', options: ['INR', 'USD', 'EUR'] },
    { key: 'revisionNumber', label: 'Revision #', type: 'number', readOnly: true },
    { key: 'approvalStatus', label: 'Approval Status', readOnly: true },
    { key: 'remarks', label: 'Remarks', type: 'textarea', span2: true },
  ],
};
