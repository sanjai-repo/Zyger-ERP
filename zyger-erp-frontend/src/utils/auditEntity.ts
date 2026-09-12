const DOC_TYPE_ENTITY_MAP: Record<string, string> = {
  'purchase-request': 'PurchaseRequest',
  'supplier-enquiry': 'SupplierEnquiry',
  'supplier-quotation': 'SupplierQuotation',
  'purchase-order': 'PurchaseOrder',
  'job-order': 'JobOrder',
  'purchase-target': 'PurchaseTarget',
  'purchase-price-list': 'PurchasePriceList',
  'job-work-price-list': 'JobWorkPriceList',
  'sales-order': 'SalesOrder',
  'proforma-invoice': 'ProformaInvoice',
  'sales-dc': 'SalesDc',
  'sales-invoice': 'SalesInvoice',
  'dc-return': 'DcReturn',
  'invoice-return': 'InvoiceReturn',
  'quality-ncr': 'QualityNcr',
  'quality-calibration-record': 'QualityCalibrationRecord',
  'quality-concession': 'QualityConcession',
  'quality-test-certificate': 'QualityTestCertificate',
  'quality-customer-complaint': 'QualityCustomerComplaint',
  'quality-capa': 'QualityCapa',
  'quality-8d': 'Quality8d',
  'production-bom': 'ProductionBOM',
  'route-sheet': 'RouteSheet',
  'work-order': 'WorkOrder',
  'shop-floor-entry': 'ShopFloorEntry',
  'job-card': 'JobCard',
};

export function auditEntityTypeFor(docType: string): string {
  if (DOC_TYPE_ENTITY_MAP[docType]) return DOC_TYPE_ENTITY_MAP[docType];
  return docType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
