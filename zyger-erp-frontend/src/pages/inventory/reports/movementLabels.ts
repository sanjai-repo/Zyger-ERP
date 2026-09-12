export const IN_TX_TYPES = [
  'PO_INWARD',
  'LO_INWARD',
  'JO_INWARD',
  'GENERAL_INWARD',
  'RETURN_INWARD',
  'GRN',
  'DC_RETURN',
  'INVOICE_RETURN',
  'STOCK_RETURN',
  'RECEIVED_AGAINST_ISSUE',
  'RECEIPT_RETURN',
  'RETURN_RECEIPT',
  'FG_RECEIPT',
  'TRANSFER_RECEIPT',
  'TRANSFER_IN',
  'CONVERSION_IN',
  'QC_INSPECTION_PASS',
] as const;

export const OUT_TX_TYPES = [
  'RM_ISSUE',
  'GENERAL_ISSUE',
  'JO_DC_ISSUE',
  'ISSUE_INTERNAL_EXTERNAL',
  'ISSUE_AGAINST_RECEIPT',
  'SALES_DC',
  'JO_DC',
  'GENERAL_DC',
  'RETURN_DC',
  'TRANSFER_DC',
  'STOCK_RELEASE',
  'PURCHASE_RETURN',
  'PRODUCTION_CONSUMPTION',
  'QC_DISPOSE',
  'ISSUE',
] as const;

function titleCase(code: string): string {
  return code
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

export function txMovementLabel(txType: string): string {
  const t = (txType || '').toUpperCase();
  const labels: Record<string, string> = {
    PO_INWARD: 'Purchase Order Inward',
    LO_INWARD: 'Job Inward (LO)',
    JO_INWARD: 'Job Inward (JO)',
    GENERAL_INWARD: 'General Inward',
    RETURN_INWARD: 'Inward Return',
    GRN: 'Goods Received (GRN)',
    DC_RETURN: 'DC Return',
    INVOICE_RETURN: 'Invoice Return',
    STOCK_RETURN: 'Stock Return',
    RECEIVED_AGAINST_ISSUE: 'Returned Against Issue',
    RECEIPT_RETURN: 'Receipt Return',
    RETURN_RECEIPT: 'Return Receipt',
    FG_RECEIPT: 'Finished Goods Receipt',
    TRANSFER_RECEIPT: 'Transfer Received',
    TRANSFER_IN: 'Transfer In',
    CONVERSION_IN: 'Conversion In',
    QC_INSPECTION_PASS: 'Inspection Passed',
    RM_ISSUE: 'Raw Material Issue',
    GENERAL_ISSUE: 'General Issue',
    JO_DC_ISSUE: 'Job DC Issue',
    ISSUE_INTERNAL_EXTERNAL: 'Internal / External Issue',
    ISSUE_AGAINST_RECEIPT: 'Issue Against Receipt',
    SALES_DC: 'Goods Out (Sales DC)',
    JO_DC: 'Goods Out (Job DC)',
    GENERAL_DC: 'Goods Out (General DC)',
    RETURN_DC: 'Goods Out (Return DC)',
    TRANSFER_DC: 'Goods Out (Transfer DC)',
    STOCK_RELEASE: 'Stock Release',
    PURCHASE_RETURN: 'Purchase Return',
    PRODUCTION_CONSUMPTION: 'Production Consumption',
    QC_DISPOSE: 'Quality Disposal',
    ISSUE: 'Spare-Part Issue',
  };
  return labels[t] ?? titleCase(t);
}