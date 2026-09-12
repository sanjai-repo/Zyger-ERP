export type RmiDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface RmiNextNumber {
  prefix?: string;
  nextNumber: string;
}

export interface RmiLinePayload {
  itemCode: string;
  issueQty: number;
  batchNo?: string;
  heatNo?: string;
  returnable?: string;
  location: string;
  remarks?: string;
}

export interface RmiPayload {
  date: string;
  jobOrderNo: string;
  issueRequestNo?: string;
  sourceLocation: string;
  remarks?: string;
  lines: RmiLinePayload[];
}

export interface RmiLineDto {
  itemCode: string;
  itemDesc?: string;
  issueQty?: number;
  batchNo?: string;
  heatNo?: string;
  returnable?: string;
  location?: string;
  remarks?: string;
}

export interface RmiDto {
  id?: string;
  docNo?: string;
  date: string;
  jobOrderNo: string;
  issueRequestNo?: string;
  sourceLocation: string;
  remarks?: string;
  status: string;
  lines: RmiLineDto[];
}

export interface RmiListRowDto {
  id: string;
  docNo: string;
  date: string;
  issueRequestNo?: string;
  sourceLocation?: string;
  qty?: number;
  status: string;
  lines?: Array<{ returnable?: string }>;
}

export interface RmiListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}

export interface StockAvailabilityPair {
  itemCode: string;
  location: string;
}

export interface StockAvailabilityResult {
  itemCode: string;
  location: string;
  availableQty: number;
}