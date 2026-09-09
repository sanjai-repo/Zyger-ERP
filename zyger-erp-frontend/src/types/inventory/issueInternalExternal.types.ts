export type IssueInternalExternalType = 'INTERNAL' | 'EXTERNAL';

export type IssueInternalExternalReturnable = 'Yes' | 'No';

export type IssueInternalExternalDocumentAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'post'
  | 'cancel'
  | 'reopen';

export interface IssueInternalExternalLinePayload {
  itemCode: string;
  issueQty: number;
  batchNo?: string;
  heatNo?: string;
  returnable?: string;
  location: string;
  remarks?: string;
}

export interface IssueInternalExternalPayload {
  issueType: IssueInternalExternalType;
  returnable: IssueInternalExternalReturnable;
  toDepartment?: string;
  issuedTo?: string;
  date: string;
  issueRequestNo?: string;
  sourceLocation: string;
  remarks?: string;
  lines: IssueInternalExternalLinePayload[];
}

export interface IssueInternalExternalLineDto {
  itemCode: string;
  itemDesc?: string;
  issueQty?: number;
  batchNo?: string;
  heatNo?: string;
  returnable?: string;
  location?: string;
  remarks?: string;
}

export interface IssueInternalExternalDto {
  id?: string;
  docNo?: string;
  issueType: IssueInternalExternalType;
  returnable?: IssueInternalExternalReturnable;
  toDepartment?: string;
  issuedTo?: string;
  date: string;
  issueRequestNo?: string;
  sourceLocation: string;
  remarks?: string;
  status: string;
  lines: IssueInternalExternalLineDto[];
}

export interface IssueInternalExternalListRowDto {
  id: string;
  docNo: string;
  date: string;
  issueType: IssueInternalExternalType;
  issueRequestNo?: string;
  toDepartment?: string;
  issuedTo?: string;
  returnable?: string;
  sourceLocation?: string;
  qty?: number;
  status: string;
}

export interface IssueInternalExternalListParams {
  page: number;
  size: number;
  sort?: string;
  search?: string;
  status?: string;
  issueType?: string;
  returnable?: string;
}

export interface IssueInternalExternalNextNumber {
  prefix?: string;
  nextNumber: string;
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