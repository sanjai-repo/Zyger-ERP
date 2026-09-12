export type AdjustmentDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface AdjustmentListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}

/* ==================== STOCK AMENDMENT ==================== */

export interface StockAmendmentPayload {
  date: string;
  itemCode: string;
  location: string;
  batchNo?: string;
  correctedQty: number;
  reasonCode: string;
  remarks: string;
}

export interface StockAmendmentDto {
  id?: string;
  docNo?: string;
  date: string;
  itemCode: string;
  location: string;
  batchNo?: string;
  systemQty?: number;
  correctedQty: number;
  differenceQty?: number;
  reasonCode: string;
  remarks: string;
  status: string;
}

export interface StockAmendmentListRowDto {
  id: string;
  docNo: string;
  date: string;
  itemCode?: string;
  itemName?: string;
  differenceQty?: number;
  reasonCode?: string;
  status: string;
}

/* ==================== PHYSICAL STOCK AMENDMENT ==================== */

export interface PhysicalStockAmendmentLinePayload {
  itemCode: string;
  batchNo?: string;
  physicalQty: number;
  reasonCode?: string;
}

export interface PhysicalStockAmendmentPayload {
  date: string;
  storeLocation: string;
  countTeam: string;
  countType: string;
  lines: PhysicalStockAmendmentLinePayload[];
}

export interface PhysicalStockAmendmentLineDto {
  itemCode: string;
  itemDesc?: string;
  batchNo?: string;
  systemQty?: number;
  physicalQty?: number;
  varianceQty?: number;
  varianceValue?: number;
  reasonCode?: string;
}

export interface PhysicalStockAmendmentDto {
  id?: string;
  docNo?: string;
  date: string;
  storeLocation: string;
  countTeam: string;
  countType: string;
  status: string;
  lines: PhysicalStockAmendmentLineDto[];
}

export interface PhysicalStockAmendmentListRowDto {
  id: string;
  docNo: string;
  date: string;
  storeLocation?: string;
  countType?: string;
  qty?: number;
  status: string;
}

/* ==================== STOCK BALANCE ==================== */

export interface StockBalanceResponse {
  itemCode: string;
  location: string;
  batchNo?: string;
  onHand: number;
}