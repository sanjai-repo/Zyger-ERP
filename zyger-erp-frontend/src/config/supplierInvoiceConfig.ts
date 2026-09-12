export const PURCHASE_INVOICE_CONFIG = {
  screenId: 'purchase-invoice',
  title: 'Purchase Invoice',
  prefix: 'PINV',
  icon: 'receipt_long',
  subtitle: 'Three-way match: PO + GRN + Supplier Invoice',
  apiPath: '/inventory/supplier-invoice/purchase-invoice',
  hasLines: false,
};

export const SUBCONTRACT_INVOICE_CONFIG = {
  screenId: 'subcontract-invoice',
  title: 'Sub-Contract Invoice',
  prefix: 'SINV',
  icon: 'receipt_long',
  subtitle: 'Subcontract processing charges',
  apiPath: '/inventory/supplier-invoice/subcontract-invoice',
  hasLines: true,
};

export const PROCESS_OPTIONS = [
  'Heat Treatment',
  'Plating',
  'Grinding',
];