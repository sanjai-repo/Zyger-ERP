export interface InventoryDashboardSummary {
  totalOnHand: number;
  reservedQty: number;
  availableQty: number;
  lowStockCount: number;
  pendingInwardCount: number;
  pendingApprovalCount: number;
  ledgerEntryCount: number;
}

export interface LedgerEntryDto {
  date: string;
  documentNo: string;
  transactionType: string;
  itemCode: string;
  inQty?: number;
  outQty?: number;
}

export interface LowStockItemDto {
  itemCode: string;
  itemName: string;
  onHandQty: number;
  safetyQty: number;
}