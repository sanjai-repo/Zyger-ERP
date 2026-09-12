export type SirDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'reopen'
  | 'cancel';

export interface SirNextNumber {
  prefix?: string;
  nextNumber: string;
}

export interface SirLinePayload {
  itemCode: string;
  requestedQty: number;
  approvedQty?: number;
  returnable: string;
  remarks?: string;
}

export interface SirPayload {
  date: string;
  department: string;
  requestedBy: string;
  requiredDate: string;
  jobOrderNo?: string;
  purpose: string;
  remarks?: string;
  lines: SirLinePayload[];
}

export interface SirLineDto {
  itemCode: string;
  itemDesc?: string;
  requestedQty?: number;
  approvedQty?: number;
  returnable?: string;
  remarks?: string;
}

export interface SirDto {
  id?: string;
  docNo?: string;
  date: string;
  department: string;
  requestedBy: string;
  requiredDate: string;
  jobOrderNo?: string;
  purpose: string;
  remarks?: string;
  status: string;
  lines: SirLineDto[];
}

export interface SirListRowDto {
  id: string;
  docNo: string;
  date: string;
  department?: string;
  requestedBy?: string;
  qty?: number;
  status: string;
}

export interface SirListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
}

export interface SirApprovedRequest {
  id: string;
  docNo: string;
  date?: string;
  department?: string;
}