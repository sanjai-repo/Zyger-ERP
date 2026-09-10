export type AllotmentDocumentAction =
  | 'submit'
  | 'approve'
  | 'cancel'
  | 'reopen';

export type ReleaseDocumentAction =
  | 'submit'
  | 'approve'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface StockAllotmentLinePayload {
  itemCode: string;
  allottedQty: number;
  batchNo?: string;
  heatNo?: string;
  location: string;
}

export interface StockAllotmentPayload {
  date: string;
  allotmentType: string;
  referenceNo: string;
  customer?: string;
  remarks?: string;
  lines: StockAllotmentLinePayload[];
}

export interface StockAllotmentLineDto {
  itemCode: string;
  itemDesc?: string;
  allottedQty?: number;
  batchNo?: string;
  heatNo?: string;
  location?: string;
}

export interface StockAllotmentDto {
  id?: string;
  docNo?: string;
  date: string;
  allotmentType: string;
  referenceNo: string;
  customer?: string;
  remarks?: string;
  status: string;
  lines: StockAllotmentLineDto[];
}

export interface StockAllotmentListRowDto {
  id: string;
  docNo: string;
  date: string;
  allotmentType?: string;
  referenceNo?: string;
  qty?: number;
  status: string;
}

export interface StockReleaseLinePayload {
  itemCode: string;
  releasedQty: number;
  batchNo?: string;
  location?: string;
}

export interface StockReleasePayload {
  date: string;
  allotmentNo: string;
  reason: string;
  remarks?: string;
  lines: StockReleaseLinePayload[];
}

export interface StockReleaseLineDto {
  itemCode: string;
  itemDesc?: string;
  releasedQty?: number;
  batchNo?: string;
  location?: string;
}

export interface StockReleaseDto {
  id?: string;
  docNo?: string;
  date: string;
  allotmentNo: string;
  reason: string;
  remarks?: string;
  status: string;
  lines: StockReleaseLineDto[];
}

export interface StockReleaseListRowDto {
  id: string;
  docNo: string;
  date: string;
  allotmentNo?: string;
  reason?: string;
  qty?: number;
  status: string;
}

export interface AllotmentListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}