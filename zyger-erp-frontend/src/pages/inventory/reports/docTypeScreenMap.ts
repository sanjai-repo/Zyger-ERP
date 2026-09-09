const DOC_KEYS = [
  'dc-return',
  'general-dc',
  'general-inward',
  'general-issue',
  'stock-return',
  'invoice-return',
  'issue-internal-external',
  'jo-dc',
  'jo-inward',
  'lo-inward',
  'physical-stock-amendment',
  'po-inward',
  'purchase-invoice',
  'return-inward',
  'rm-issue',
  'stock-allotment',
  'stock-amendment',
  'stock-issue-request',
  'stock-release',
  'subcontract-invoice',
  'transfer-dc',
  'quality-inspection',
  'quality-ncr',
];

function labelToScreen(docType: string): string | undefined {
  const normalized = docType.toLowerCase().replace(/_/g, '-');
  return DOC_KEYS.includes(normalized) ? normalized : undefined;
}

function screenToLabel(screenId: string): string | undefined {
  return labelToScreen(screenId.toUpperCase().replace(/-/g, '_'));
}

export const docTypeScreenMap = {
  labelToScreen,
  screenToLabel,
  DOC_KEYS,
};
